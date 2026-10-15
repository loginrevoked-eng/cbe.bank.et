#!/usr/bin/env python3
"""
pg_editor_fluent.py - tiny Postgres table editor, PySide6 + Fluent Widgets.

Install:   pip install PySide6 "PySide6-Fluent-Widgets[full]" psycopg2-binary
           (don't have PyQt5/6-Fluent-Widgets installed next to it, they clash)
Run:       python pg_editor_fluent.py
           python pg_editor_fluent.py "postgresql://user:pass@host/db?sslmode=require"

Connection: CLI argument, then NEON_DATABASE_URL / DATABASE_URL from the
environment, then a .env file (current folder, then next to this script).
If none is found you get a dialog to paste the URL.

- Pick a table on the left. Double-click a cell (or press F2) to edit,
  Enter to apply. Type <NULL> to set a cell to NULL.
- Everything runs in one transaction: nothing is permanent until Commit.
- Tables without a primary key are read-only.
"""
import argparse
import os
import sys

import psycopg2
from psycopg2 import sql
from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QColor
from PySide6.QtWidgets import (QAbstractItemView, QApplication, QFormLayout, QFrame,
                               QHBoxLayout, QMessageBox, QScrollArea, QSplitter,
                               QTableWidgetItem, QVBoxLayout, QWidget)
from qfluentwidgets import (BodyLabel, CaptionLabel, FluentIcon, InfoBar, InfoBarPosition,
                            LineEdit, ListWidget, MessageBox, MessageBoxBase,
                            PasswordLineEdit, PrimaryPushButton, PushButton, SpinBox,
                            SubtitleLabel, TableWidget, Theme, isDarkTheme, setTheme)

NULL_TEXT = "<NULL>"
ENV_KEYS = ("NEON_DATABASE_URL", "DATABASE_URL")


def fmt(v):
    return NULL_TEXT if v is None else str(v)


def find_db_url():
    """CLI argument first, then env vars, then a .env file
    (current directory first, then next to this script)."""
    parser = argparse.ArgumentParser()
    parser.add_argument("pg_string", nargs="?", default="")
    args, _ = parser.parse_known_args()
    if args.pg_string:
        return args.pg_string
    for k in ENV_KEYS:
        if os.environ.get(k):
            return os.environ[k]
    here = os.path.dirname(os.path.abspath(__file__))
    for path in (".env", os.path.join(here, ".env")):
        if not os.path.isfile(path):
            continue
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if line.startswith("export "):
                    line = line[7:]
                key, _, val = line.partition("=")
                if key.strip() in ENV_KEYS:
                    return val.strip().strip("'\"")
    return ""


# ---------------------------------------------------------------- dialogs
class ConnectDialog(MessageBoxBase):
    def __init__(self, url, parent):
        super().__init__(parent)
        self.viewLayout.addWidget(SubtitleLabel("Connect to Postgres", self))
        self.viewLayout.addWidget(BodyLabel("Connection URL", self))
        self.edit = PasswordLineEdit(self)
        self.edit.setText(url)
        self.edit.setPlaceholderText("postgresql://user:pass@host/db?sslmode=require")
        self.edit.setMinimumWidth(520)
        self.viewLayout.addWidget(self.edit)
        self.yesButton.setText("Connect")
        self.cancelButton.setText("Cancel")
        self.widget.setMinimumWidth(580)

    def validate(self):
        return bool(self.edit.text().strip())


class AddRowDialog(MessageBoxBase):
    """One field per column. Blank = column default, <NULL> = force NULL,
    * = required (NOT NULL without a default)."""

    def __init__(self, meta, parent):
        super().__init__(parent)
        self.meta = meta
        self.edits = {}
        self.viewLayout.addWidget(SubtitleLabel("Add row", self))
        self.viewLayout.addWidget(
            CaptionLabel("Blank = default  ·  <NULL> = force NULL  ·  * = required", self))

        scroll = QScrollArea(self)
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.NoFrame)
        scroll.setStyleSheet("QScrollArea{background:transparent;border:none;}")
        inner = QWidget()
        inner.setStyleSheet("background:transparent;")
        form = QFormLayout(inner)
        form.setSpacing(8)
        for name, typ, nullable, default in meta:
            required = nullable == "NO" and default is None
            ed = LineEdit(inner)
            ed.setPlaceholderText(typ + ("  ·  has default" if default is not None else ""))
            form.addRow(BodyLabel(name + (" *" if required else ""), inner), ed)
            self.edits[name] = ed
        scroll.setWidget(inner)
        scroll.setMinimumWidth(500)
        scroll.setMinimumHeight(min(420, 46 * len(meta) + 12))
        self.viewLayout.addWidget(scroll)
        self.yesButton.setText("Insert")
        self.cancelButton.setText("Cancel")

    @property
    def values(self):
        return {n: e.text() for n, e in self.edits.items() if e.text() != ""}

    def validate(self):
        vals = self.values
        missing = [n for n, _, nullable, default in self.meta
                   if nullable == "NO" and default is None and n not in vals]
        if missing:
            InfoBar.warning(title="Required", content="Fill in: " + ", ".join(missing),
                            orient=Qt.Horizontal, isClosable=True,
                            position=InfoBarPosition.TOP, duration=2500, parent=self)
            return False
        return True


# ---------------------------------------------------------------- main window
class MainWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("PG Editor")
        self.resize(1200, 720)
        self.setObjectName("root")
        self.setAttribute(Qt.WA_StyledBackground, True)
        self.setStyleSheet("#root{background-color:%s;}" % ("#202020" if isDarkTheme() else "#f9f9f9"))

        self.conn = None
        self.schema = self.tbl = None
        self.cols, self.pk, self.rows, self.table_list = [], [], [], []
        self.dirty = False

        self.build_ui()
        QTimer.singleShot(100, lambda: self.connect_db(auto=True))

    # ---------- UI ----------
    def make_btn(self, text, icon, slot, primary=False):
        btn = (PrimaryPushButton if primary else PushButton)(text, self)
        btn.setIcon(icon)
        btn.clicked.connect(lambda: slot())
        return btn

    def build_ui(self):
        root = QVBoxLayout(self)
        root.setContentsMargins(16, 12, 16, 8)
        root.setSpacing(10)

        bar = QHBoxLayout()
        bar.setSpacing(8)
        bar.addWidget(self.make_btn("Connect", FluentIcon.LINK, self.connect_db))
        bar.addWidget(self.make_btn("Reload", FluentIcon.SYNC, self.reload_clicked))
        bar.addSpacing(14)
        bar.addWidget(self.make_btn("Commit", FluentIcon.SAVE, self.commit, primary=True))
        bar.addWidget(self.make_btn("Rollback", FluentIcon.HISTORY, self.rollback))
        bar.addSpacing(14)
        bar.addWidget(self.make_btn("Add row", FluentIcon.ADD, self.add_row))
        bar.addWidget(self.make_btn("Delete row", FluentIcon.DELETE, self.delete_row))
        bar.addStretch(1)
        self.dirty_label = CaptionLabel("", self)
        bar.addWidget(self.dirty_label)
        root.addLayout(bar)

        flt = QHBoxLayout()
        flt.setSpacing(8)
        flt.addWidget(BodyLabel("WHERE", self))
        self.where = LineEdit(self)
        self.where.setPlaceholderText("e.g.  balance > 1000   (press Enter)")
        self.where.setClearButtonEnabled(True)
        self.where.returnPressed.connect(self.load_table)
        flt.addWidget(self.where, 1)
        flt.addWidget(BodyLabel("Limit", self))
        self.limit = SpinBox(self)
        self.limit.setRange(1, 100000)
        self.limit.setValue(500)
        self.limit.setFixedWidth(150)
        flt.addWidget(self.limit)
        root.addLayout(flt)

        split = QSplitter(Qt.Horizontal, self)
        split.setChildrenCollapsible(False)
        self.tables = ListWidget(self)
        self.tables.setMinimumWidth(160)
        self.tables.currentRowChanged.connect(self.on_pick_table)
        split.addWidget(self.tables)

        self.grid = TableWidget(self)
        self.grid.setBorderVisible(True)
        self.grid.setBorderRadius(8)
        self.grid.verticalHeader().hide()
        self.grid.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.grid.setSelectionMode(QAbstractItemView.SingleSelection)
        self.grid.setEditTriggers(QAbstractItemView.DoubleClicked | QAbstractItemView.EditKeyPressed)
        self.grid.itemChanged.connect(self.on_item_changed)
        split.addWidget(self.grid)
        split.setStretchFactor(0, 0)
        split.setStretchFactor(1, 1)
        split.setSizes([220, 980])
        root.addWidget(split, 1)

        self.status = CaptionLabel("Not connected", self)
        root.addWidget(self.status)

    def set_status(self, msg):
        self.status.setText(msg)

    def set_dirty(self, dirty):
        self.dirty = dirty
        self.dirty_label.setText("● Uncommitted changes" if dirty else "")
        self.dirty_label.setStyleSheet("color:#ef6c00;font-weight:600;" if dirty else "")

    def toast(self, kind, title, content=""):
        fn = {"success": InfoBar.success, "info": InfoBar.info,
              "warning": InfoBar.warning, "error": InfoBar.error}[kind]
        fn(title=title, content=content, orient=Qt.Horizontal, isClosable=True,
           position=InfoBarPosition.TOP_RIGHT, duration=2200, parent=self)

    def error_box(self, title, msg):
        box = MessageBox(title, msg, self)
        box.cancelButton.hide()
        box.yesButton.setText("OK")
        box.exec()

    # ---------- connection ----------
    def connect_db(self, auto=False):
        if self.dirty:
            box = MessageBox("Uncommitted changes", "Discard uncommitted changes and reconnect?", self)
            if not box.exec():
                return
        url = find_db_url()
        if not (auto and url):  # silent connect at startup when a URL is found
            dlg = ConnectDialog(url, self)
            if not dlg.exec():
                return
            url = dlg.edit.text().strip()
        if not url:
            return
        try:
            new = psycopg2.connect(url)
        except Exception as ex:
            self.error_box("Connection failed", str(ex))
            return
        if self.conn:
            self.conn.close()
        self.conn = new
        self.set_dirty(False)
        self.schema = self.tbl = None
        self.grid.setRowCount(0)
        self.grid.setColumnCount(0)
        self.refresh_tables()
        self.set_status(f"Connected to {new.info.dbname} @ {new.info.host}")
        self.toast("success", "Connected", f"{new.info.dbname}")

    def refresh_tables(self):
        self.tables.blockSignals(True)
        self.tables.clear()
        self.table_list = []
        with self.conn.cursor() as cur:
            cur.execute("""SELECT table_schema, table_name FROM information_schema.tables
                           WHERE table_type='BASE TABLE'
                             AND table_schema NOT IN ('pg_catalog','information_schema')
                           ORDER BY 1, 2""")
            for s, t in cur.fetchall():
                self.table_list.append((s, t))
                self.tables.addItem(t if s == "public" else f"{s}.{t}")
        self.conn.rollback()  # end the read-only txn opened by the catalog query
        self.tables.blockSignals(False)

    # ---------- table loading ----------
    def on_pick_table(self, idx):
        if idx < 0 or idx >= len(self.table_list):
            return
        self.schema, self.tbl = self.table_list[idx]
        self.where.clear()
        self.load_table()

    def qualified(self):
        return sql.SQL("{}.{}").format(sql.Identifier(self.schema), sql.Identifier(self.tbl))

    def reload_clicked(self):
        self.load_table()
        if self.tbl:
            self.toast("info", "Reloaded", f"{len(self.rows)} rows")

    def load_table(self):
        if not self.conn or not self.tbl:
            return
        try:
            with self.conn.cursor() as cur:
                q = sql.SQL("SELECT * FROM {}").format(self.qualified())
                if self.where.text().strip():
                    q += sql.SQL(" WHERE ") + sql.SQL(self.where.text())
                q += sql.SQL(" LIMIT %s")
                cur.execute(q, [self.limit.value()])
                self.cols = [d[0] for d in cur.description]
                self.rows = cur.fetchall()
                cur.execute("""SELECT a.attname FROM pg_index i
                               JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                               WHERE i.indrelid = %s::regclass AND i.indisprimary""",
                            [f'"{self.schema}"."{self.tbl}"'])
                self.pk = [r[0] for r in cur.fetchall()]
        except Exception as ex:
            self.conn.rollback()
            self.set_dirty(False)
            self.error_box("Query failed", f"{ex}\n\n(Transaction rolled back.)")
            return

        grey = QColor("#8a8a8a")
        self.grid.blockSignals(True)
        self.grid.clear()
        self.grid.setRowCount(len(self.rows))
        self.grid.setColumnCount(len(self.cols))
        self.grid.setHorizontalHeaderLabels([f"🔑 {c}" if c in self.pk else c for c in self.cols])
        for r, row in enumerate(self.rows):
            for c, v in enumerate(row):
                item = QTableWidgetItem(fmt(v))
                if v is None:
                    item.setForeground(grey)
                if not self.pk:
                    item.setFlags(item.flags() & ~Qt.ItemIsEditable)
                self.grid.setItem(r, c, item)
        self.grid.resizeColumnsToContents()
        for c in range(len(self.cols)):
            self.grid.setColumnWidth(c, max(100, min(self.grid.columnWidth(c) + 16, 340)))
        self.grid.blockSignals(False)

        ro = "" if self.pk else "  ·  READ-ONLY (no primary key)"
        self.set_status(f"{self.schema}.{self.tbl}: {len(self.rows)} rows{ro}")

    # ---------- editing ----------
    def pk_where(self, row):
        idx = [self.cols.index(c) for c in self.pk]
        where = sql.SQL(" AND ").join(sql.SQL("{} = %s").format(sql.Identifier(c)) for c in self.pk)
        return where, [row[i] for i in idx]

    def on_item_changed(self, item):
        r, c = item.row(), item.column()
        if not self.pk or r >= len(self.rows):
            return
        text = item.text()
        row, col = self.rows[r], self.cols[c]
        if fmt(row[c]) == text:
            return
        new = None if text == NULL_TEXT else text
        where, params = self.pk_where(row)
        q = sql.SQL("UPDATE {} SET {} = %s WHERE ").format(self.qualified(), sql.Identifier(col)) + where
        try:
            with self.conn.cursor() as cur:
                cur.execute(q, [new] + params)
                if cur.rowcount != 1:
                    raise RuntimeError(f"Expected to update 1 row, updated {cur.rowcount}.")
        except Exception as ex:
            self.conn.rollback()
            self.set_dirty(False)
            self.error_box("Update failed", f"{ex}\n\nAll uncommitted changes were rolled back.")
            self.load_table()
            return
        self.set_dirty(True)
        self.toast("info", "Cell updated", "not committed yet")
        if col in self.pk:
            QTimer.singleShot(0, self.load_table)  # keys changed: re-read so later edits hit the right row
            return
        self.rows[r] = tuple(new if i == c else v for i, v in enumerate(row))
        self.grid.blockSignals(True)
        item.setForeground(QColor("#8a8a8a") if new is None else self.grid.palette().text().color())
        self.grid.blockSignals(False)

    def add_row(self):
        if not self.conn or not self.tbl:
            return
        try:
            with self.conn.cursor() as cur:
                cur.execute("""SELECT column_name, data_type, is_nullable, column_default
                               FROM information_schema.columns
                               WHERE table_schema = %s AND table_name = %s
                               ORDER BY ordinal_position""", [self.schema, self.tbl])
                meta = cur.fetchall()
        except Exception as ex:
            self.conn.rollback()
            self.set_dirty(False)
            self.error_box("Add row failed", str(ex))
            return
        dlg = AddRowDialog(meta, self)
        if not dlg.exec():
            return
        vals = dlg.values
        try:
            with self.conn.cursor() as cur:
                if vals:
                    cols = list(vals)
                    params = [None if vals[c] == NULL_TEXT else vals[c] for c in cols]
                    cur.execute(sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
                        self.qualified(),
                        sql.SQL(", ").join(sql.Identifier(c) for c in cols),
                        sql.SQL(", ").join(sql.Placeholder() * len(cols))), params)
                else:
                    cur.execute(sql.SQL("INSERT INTO {} DEFAULT VALUES").format(self.qualified()))
            self.set_dirty(True)
            self.toast("info", "Row added", "not committed yet")
        except Exception as ex:
            self.conn.rollback()
            self.set_dirty(False)
            self.error_box("Insert failed", f"{ex}\n\nAll uncommitted changes were rolled back.")
        self.load_table()

    def delete_row(self):
        r = self.grid.currentRow()
        if r < 0 or r >= len(self.rows) or not self.pk:
            self.toast("warning", "Select a row first",
                       "" if self.pk else "this table has no primary key")
            return
        where, params = self.pk_where(self.rows[r])
        box = MessageBox("Delete row", f"Delete this row?\n\n{dict(zip(self.pk, params))}", self)
        box.yesButton.setText("Delete")
        if not box.exec():
            return
        try:
            with self.conn.cursor() as cur:
                cur.execute(sql.SQL("DELETE FROM {} WHERE ").format(self.qualified()) + where, params)
            self.set_dirty(True)
            self.toast("warning", "Row deleted", "not committed yet")
        except Exception as ex:
            self.conn.rollback()
            self.set_dirty(False)
            self.error_box("Delete failed", f"{ex}\n\nAll uncommitted changes were rolled back.")
        self.load_table()

    # ---------- transactions ----------
    def commit(self):
        if not self.conn:
            return
        if not self.dirty:
            self.toast("info", "Nothing to commit")
            return
        try:
            self.conn.commit()
        except Exception as ex:
            self.conn.rollback()
            self.set_dirty(False)
            self.error_box("Commit failed", f"{ex}\n\nChanges were rolled back.")
            self.load_table()
            return
        self.set_dirty(False)
        self.toast("success", "Committed", "changes are saved")
        self.set_status("Committed")

    def rollback(self):
        if not self.conn:
            return
        had = self.dirty
        self.conn.rollback()
        self.set_dirty(False)
        self.load_table()
        self.toast("warning" if had else "info",
                   "Rolled back" if had else "Nothing to roll back")

    def closeEvent(self, event):
        if self.dirty:
            ans = QMessageBox.question(self, "Uncommitted changes",
                                       "Commit before closing?\n(No = discard)",
                                       QMessageBox.Yes | QMessageBox.No | QMessageBox.Cancel)
            if ans == QMessageBox.Cancel:
                event.ignore()
                return
            if ans == QMessageBox.Yes:
                self.conn.commit()
        if self.conn:
            self.conn.close()
        event.accept()


if __name__ == "__main__":
    app = QApplication(sys.argv[:1])  # keep Qt from parsing the URL argument
    setTheme(Theme.AUTO)
    win = MainWindow()
    win.show()
    sys.exit(app.exec())