#!/usr/bin/env python3
"""
pg_editor.py - tiny Postgres table editor in tkinter.

Install:   pip install psycopg2-binary
Run:       python pg_editor.py

Connection: reads NEON_DATABASE_URL (or DATABASE_URL) from the environment or a
.env file in the current folder / next to this script, and connects on startup.
If none is found, it asks you to paste the URL.

- Pick a table on the left, it loads into a grid.
- Double-click a cell to edit. Enter = apply, Esc = cancel.
- Type  <NULL>  in a cell to set it to NULL.
- Edits run inside a transaction: nothing is permanent until you hit Commit.
- Tables without a primary key are read-only (no safe way to target a row).
"""
import argparse
import os
import tkinter as tk
from tkinter import ttk, messagebox

import psycopg2
from psycopg2 import sql

NULL_TEXT = "<NULL>"


def fmt(v):
    return NULL_TEXT if v is None else str(v)


ENV_KEYS = ("NEON_DATABASE_URL", "DATABASE_URL")


def find_db_url():
    """Look for the connection string in env vars, then in a .env file
    (current directory first, then next to this script)."""
    parser = argparse.ArgumentParser()
    parser.add_argument("pg_string", nargs="?", default="")
    args, _ = parser.parse_known_args()  # ignore stray args instead of exiting
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


class ConnectDialog(tk.Toplevel):
    def __init__(self, parent, default_url=""):
        super().__init__(parent)
        self.title("Connect to Postgres")
        self.resizable(False, False)
        self.result = None
        self.var = tk.StringVar(value=default_url)
        ttk.Label(self, text="Connection URL (postgresql://user:pass@host/db?sslmode=require)"
                  ).grid(row=0, column=0, columnspan=2, sticky="w", padx=8, pady=(8, 2))
        self.entry = ttk.Entry(self, textvariable=self.var, width=70, show="*")
        self.entry.grid(row=1, column=0, columnspan=2, padx=8, pady=4)
        self.show = tk.BooleanVar(value=False)
        ttk.Checkbutton(self, text="Show", variable=self.show,
                        command=lambda: self.entry.config(show="" if self.show.get() else "*")
                        ).grid(row=2, column=0, sticky="w", padx=8)
        btns = ttk.Frame(self)
        btns.grid(row=2, column=1, sticky="e", padx=8, pady=8)
        ttk.Button(btns, text="Connect", command=self.ok).pack(side="left", padx=4)
        ttk.Button(btns, text="Cancel", command=self.destroy).pack(side="left", padx=4)
        self.bind("<Return>", lambda e: self.ok())
        self.bind("<Escape>", lambda e: self.destroy())
        self.transient(parent)
        self.grab_set()
        self.entry.focus_set()

    def ok(self):
        self.result = self.var.get().strip()
        self.destroy()


class FxButton(tk.Button):
    """Flat button with hover highlight and a quick colour flash when clicked."""
    BASE, HOVER = "#f0f0f0", "#e0e0e0"

    def __init__(self, parent, text, command, flash="#90caf9"):
        super().__init__(parent, text=text, relief="flat", bd=1, padx=12, pady=4,
                         bg=self.BASE, activebackground=flash, cursor="hand2",
                         command=lambda: self._click(command))
        self._flash, self._hovering = flash, False
        self.bind("<Enter>", lambda e: self._set(True))
        self.bind("<Leave>", lambda e: self._set(False))

    def _set(self, hovering):
        self._hovering = hovering
        self.config(bg=self.HOVER if hovering else self.BASE)

    def _click(self, command):
        self.config(bg=self._flash)
        self.after(200, lambda: self._set(self._hovering))
        command()


class AddRowDialog(tk.Toplevel):
    """One field per column. Blank = let Postgres use the default.
    Type <NULL> to force NULL. Fields marked * are required (NOT NULL, no default)."""

    def __init__(self, parent, meta):
        super().__init__(parent)
        self.title("Add row")
        self.result = None
        self.meta = meta
        self.entries = {}

        canvas = tk.Canvas(self, highlightthickness=0, width=560,
                           height=min(480, 34 * len(meta) + 10))
        sb = ttk.Scrollbar(self, orient="vertical", command=canvas.yview)
        canvas.configure(yscrollcommand=sb.set)
        inner = ttk.Frame(canvas)
        canvas.create_window((0, 0), window=inner, anchor="nw")
        inner.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.grid(row=0, column=0, sticky="nsew")
        sb.grid(row=0, column=1, sticky="ns")

        first = None
        for i, (name, typ, nullable, default) in enumerate(meta):
            required = nullable == "NO" and default is None
            ttk.Label(inner, text=name + (" *" if required else "")).grid(
                row=i, column=0, sticky="e", padx=(8, 4), pady=2)
            ent = ttk.Entry(inner, width=34)
            ent.grid(row=i, column=1, padx=4, pady=2)
            hint = typ + (" (has default)" if default is not None else "")
            ttk.Label(inner, text=hint, foreground="gray").grid(row=i, column=2, sticky="w", padx=4)
            self.entries[name] = ent
            first = first or ent

        btns = ttk.Frame(self)
        btns.grid(row=1, column=0, columnspan=2, pady=8)
        ttk.Button(btns, text="Insert", command=self.ok).pack(side="left", padx=4)
        ttk.Button(btns, text="Cancel", command=self.destroy).pack(side="left", padx=4)
        self.bind("<Escape>", lambda e: self.destroy())
        self.transient(parent)
        self.grab_set()
        if first:
            first.focus_set()

    def ok(self):
        values = {n: e.get() for n, e in self.entries.items() if e.get() != ""}
        missing = [n for n, _, nullable, default in self.meta
                   if nullable == "NO" and default is None and n not in values]
        if missing:
            messagebox.showwarning("Required", "Fill in: " + ", ".join(missing), parent=self)
            return
        self.result = values
        self.destroy()


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("PG Editor")
        self.geometry("1100x650")
        self.conn = None
        self.schema = self.table = None
        self.cols, self.pk, self.rows = [], [], []
        self.dirty = False
        self.editor = None

        self.build_ui()
        self.protocol("WM_DELETE_WINDOW", self.on_close)
        self.after(100, lambda: self.connect(auto=True))

    # ---------- UI ----------
    def build_ui(self):
        bar = ttk.Frame(self)
        bar.pack(fill="x", padx=6, pady=4)
        FxButton(bar, "Connect", self.connect, flash="#90caf9").pack(side="left")
        FxButton(bar, "Reload", self.reload_clicked, flash="#90caf9").pack(side="left", padx=(6, 0))
        ttk.Separator(bar, orient="vertical").pack(side="left", fill="y", padx=8)
        FxButton(bar, "Commit", self.commit, flash="#81c784").pack(side="left")
        FxButton(bar, "Rollback", self.rollback, flash="#ffb74d").pack(side="left", padx=(6, 0))
        ttk.Separator(bar, orient="vertical").pack(side="left", fill="y", padx=8)
        FxButton(bar, "Add row", self.add_row, flash="#81c784").pack(side="left")
        FxButton(bar, "Delete row", self.delete_row, flash="#e57373").pack(side="left", padx=(6, 0))

        flt = ttk.Frame(self)
        flt.pack(fill="x", padx=6)
        ttk.Label(flt, text="WHERE").pack(side="left")
        self.where_var = tk.StringVar()
        e = ttk.Entry(flt, textvariable=self.where_var)
        e.pack(side="left", fill="x", expand=True, padx=6)
        e.bind("<Return>", lambda ev: self.load_table())
        ttk.Label(flt, text="Limit").pack(side="left")
        self.limit_var = tk.StringVar(value="500")
        ttk.Entry(flt, textvariable=self.limit_var, width=7).pack(side="left", padx=6)

        main = ttk.PanedWindow(self, orient="horizontal")
        main.pack(fill="both", expand=True, padx=6, pady=6)

        self.tables = tk.Listbox(main, exportselection=False, width=30)
        self.tables.bind("<<ListboxSelect>>", self.on_pick_table)
        main.add(self.tables, weight=1)

        right = ttk.Frame(main)
        main.add(right, weight=5)
        self.tree = ttk.Treeview(right, show="headings", selectmode="browse")
        ys = ttk.Scrollbar(right, orient="vertical", command=self.tree.yview)
        xs = ttk.Scrollbar(right, orient="horizontal", command=self.tree.xview)
        self.tree.configure(yscrollcommand=ys.set, xscrollcommand=xs.set)
        self.tree.grid(row=0, column=0, sticky="nsew")
        ys.grid(row=0, column=1, sticky="ns")
        xs.grid(row=1, column=0, sticky="ew")
        right.rowconfigure(0, weight=1)
        right.columnconfigure(0, weight=1)
        self.tree.bind("<Double-1>", self.begin_edit)
        self.tree.bind("<MouseWheel>", lambda e: self.cancel_edit())

        self.status = tk.StringVar(value="Not connected")
        ttk.Label(self, textvariable=self.status, anchor="w", relief="sunken").pack(fill="x", side="bottom")

    def set_status(self, msg):
        flag = "  |  UNCOMMITTED CHANGES" if self.dirty else ""
        self.status.set(msg + flag)

    def toast(self, msg, color="#2e7d32"):
        """Small coloured message in the bottom-right corner, auto-hides after ~2s."""
        if getattr(self, "_toast", None) is not None and self._toast.winfo_exists():
            self._toast.destroy()
        t = tk.Label(self, text=msg, bg=color, fg="white", padx=16, pady=8,
                     font=("Segoe UI", 10, "bold"))
        t.place(relx=1.0, rely=1.0, x=-16, y=-40, anchor="se")
        self._toast = t
        self.after(2000, lambda: t.winfo_exists() and t.destroy())

    def reload_clicked(self):
        self.load_table()
        if self.table:
            self.toast(f"⟳ Reloaded {len(self.rows)} rows", color="#1565c0")

    # ---------- connection ----------
    def connect(self, auto=False):
        if self.dirty and not messagebox.askyesno("Uncommitted", "Discard uncommitted changes and reconnect?"):
            return
        url = find_db_url()
        if not (auto and url):  # auto-connect silently when a URL is found at startup
            dlg = ConnectDialog(self, url)
            self.wait_window(dlg)
            url = dlg.result
        if not url:
            return
        try:
            new = psycopg2.connect(url)
        except Exception as ex:
            messagebox.showerror("Connection failed", str(ex))
            return
        if self.conn:
            self.conn.close()
        self.conn = new
        self.dirty = False
        self.table = None
        self.tree.delete(*self.tree.get_children())
        self.refresh_tables()
        self.set_status(f"Connected to {new.info.dbname} @ {new.info.host}")

    def refresh_tables(self):
        self.tables.delete(0, "end")
        self.table_list = []
        with self.conn.cursor() as cur:
            cur.execute("""SELECT table_schema, table_name FROM information_schema.tables
                           WHERE table_type='BASE TABLE'
                             AND table_schema NOT IN ('pg_catalog','information_schema')
                           ORDER BY 1, 2""")
            for s, t in cur.fetchall():
                self.table_list.append((s, t))
                self.tables.insert("end", t if s == "public" else f"{s}.{t}")
        self.conn.rollback()  # end the read-only txn opened by the catalog query

    # ---------- table loading ----------
    def on_pick_table(self, _=None):
        sel = self.tables.curselection()
        if not sel:
            return
        self.schema, self.table = self.table_list[sel[0]]
        self.where_var.set("")
        self.load_table()

    def qualified(self):
        return sql.SQL("{}.{}").format(sql.Identifier(self.schema), sql.Identifier(self.table))

    def load_table(self):
        self.cancel_edit()
        if not self.conn or not self.table:
            return
        try:
            limit = int(self.limit_var.get())
        except ValueError:
            limit = 500
        try:
            with self.conn.cursor() as cur:
                q = sql.SQL("SELECT * FROM {}").format(self.qualified())
                if self.where_var.get().strip():
                    q += sql.SQL(" WHERE ") + sql.SQL(self.where_var.get())
                q += sql.SQL(" LIMIT %s")
                cur.execute(q, [limit])
                self.cols = [d[0] for d in cur.description]
                self.rows = cur.fetchall()
                cur.execute("""SELECT a.attname FROM pg_index i
                               JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                               WHERE i.indrelid = %s::regclass AND i.indisprimary""",
                            [f'"{self.schema}"."{self.table}"'.replace("'", "''")])
                self.pk = [r[0] for r in cur.fetchall()]
        except Exception as ex:
            self.conn.rollback()
            self.dirty = False
            messagebox.showerror("Query failed", f"{ex}\n\n(Transaction rolled back.)")
            return

        self.tree.delete(*self.tree.get_children())
        self.tree["columns"] = self.cols
        for c in self.cols:
            label = f"🔑 {c}" if c in self.pk else c
            self.tree.heading(c, text=label)
            width = max(80, min(300, 9 * max([len(c)] + [len(fmt(r[i])) for r in self.rows[:100]
                                                         for i in [self.cols.index(c)]])))
            self.tree.column(c, width=width, anchor="w")
        for i, r in enumerate(self.rows):
            self.tree.insert("", "end", iid=str(i), values=[fmt(v) for v in r])

        ro = "" if self.pk else "  |  READ-ONLY (no primary key)"
        self.set_status(f"{self.schema}.{self.table}: {len(self.rows)} rows{ro}")

    # ---------- editing ----------
    def pk_where(self, row):
        pk_idx = [self.cols.index(c) for c in self.pk]
        where = sql.SQL(" AND ").join(sql.SQL("{} = %s").format(sql.Identifier(c)) for c in self.pk)
        return where, [row[i] for i in pk_idx]

    def begin_edit(self, event):
        self.cancel_edit()
        if self.tree.identify_region(event.x, event.y) != "cell":
            return
        if not self.pk:
            self.set_status("Read-only: table has no primary key")
            return
        iid = self.tree.identify_row(event.y)
        col_id = self.tree.identify_column(event.x)
        if not iid:
            return
        col_idx = int(col_id.replace("#", "")) - 1
        x, y, w, h = self.tree.bbox(iid, col_id)
        entry = ttk.Entry(self.tree)
        entry.insert(0, self.tree.set(iid, self.cols[col_idx]))
        entry.select_range(0, "end")
        entry.place(x=x, y=y, width=w, height=h)
        entry.focus_set()
        entry.bind("<Return>", lambda e: self.apply_edit(iid, col_idx, entry.get()))
        entry.bind("<Escape>", lambda e: self.cancel_edit())
        entry.bind("<FocusOut>", lambda e: self.cancel_edit())
        self.editor = entry

    def cancel_edit(self):
        if self.editor is not None:
            ed, self.editor = self.editor, None
            ed.destroy()

    def apply_edit(self, iid, col_idx, text):
        self.cancel_edit()
        row = self.rows[int(iid)]
        col = self.cols[col_idx]
        new = None if text == NULL_TEXT else text
        if fmt(row[col_idx]) == text:
            return
        where, params = self.pk_where(row)
        q = sql.SQL("UPDATE {} SET {} = %s WHERE ").format(self.qualified(), sql.Identifier(col)) + where
        try:
            with self.conn.cursor() as cur:
                cur.execute(q, [new] + params)
                if cur.rowcount != 1:
                    raise RuntimeError(f"Expected to update 1 row, updated {cur.rowcount}. Rolled back.")
        except Exception as ex:
            self.conn.rollback()
            self.dirty = False
            messagebox.showerror("Update failed", f"{ex}\n\nAll uncommitted changes were rolled back.")
            self.load_table()
            return
        self.dirty = True
        self.toast("Cell updated (not committed)", "#1565c0")
        if col in self.pk:
            self.load_table()  # keys changed, re-read so later edits target the right row
        else:
            self.tree.set(iid, col, fmt(new))
            self.rows[int(iid)] = tuple(new if i == col_idx else v for i, v in enumerate(row))
            self.set_status(f"Updated {col} (not committed)")

    def add_row(self):
        if not self.conn or not self.table:
            return
        try:
            with self.conn.cursor() as cur:
                cur.execute("""SELECT column_name, data_type, is_nullable, column_default
                               FROM information_schema.columns
                               WHERE table_schema = %s AND table_name = %s
                               ORDER BY ordinal_position""", [self.schema, self.table])
                meta = cur.fetchall()
        except Exception as ex:
            self.conn.rollback()
            self.dirty = False
            messagebox.showerror("Add row failed", str(ex))
            return
        dlg = AddRowDialog(self, meta)
        self.wait_window(dlg)
        if dlg.result is None:
            return
        try:
            with self.conn.cursor() as cur:
                if dlg.result:
                    cols = list(dlg.result)
                    vals = [None if dlg.result[c] == NULL_TEXT else dlg.result[c] for c in cols]
                    cur.execute(sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
                        self.qualified(),
                        sql.SQL(", ").join(sql.Identifier(c) for c in cols),
                        sql.SQL(", ").join(sql.Placeholder() * len(cols))), vals)
                else:
                    cur.execute(sql.SQL("INSERT INTO {} DEFAULT VALUES").format(self.qualified()))
            self.dirty = True
            self.toast("Row added (not committed)", "#1565c0")
        except Exception as ex:
            self.conn.rollback()
            self.dirty = False
            messagebox.showerror("Insert failed",
                                 f"{ex}\n\nAll uncommitted changes were rolled back.")
        self.load_table()

    def delete_row(self):
        sel = self.tree.selection()
        if not sel or not self.pk:
            return
        row = self.rows[int(sel[0])]
        where, params = self.pk_where(row)
        if not messagebox.askyesno("Delete row", f"Delete this row?\n\n{dict(zip(self.pk, params))}"):
            return
        try:
            with self.conn.cursor() as cur:
                cur.execute(sql.SQL("DELETE FROM {} WHERE ").format(self.qualified()) + where, params)
            self.dirty = True
            self.toast("Row deleted (not committed)", "#c62828")
        except Exception as ex:
            self.conn.rollback()
            self.dirty = False
            messagebox.showerror("Delete failed", f"{ex}\n\nAll uncommitted changes were rolled back.")
        self.load_table()

    # ---------- transactions ----------
    def commit(self):
        if not self.conn:
            return
        if not self.dirty:
            self.toast("Nothing to commit", color="#616161")
            return
        try:
            self.conn.commit()
        except Exception as ex:
            self.conn.rollback()
            self.dirty = False
            messagebox.showerror("Commit failed", f"{ex}\n\nChanges were rolled back.")
            self.load_table()
            return
        self.dirty = False
        self.toast("✓ Committed")
        self.set_status("Committed")

    def rollback(self):
        if not self.conn:
            return
        had_changes = self.dirty
        self.conn.rollback()
        self.dirty = False
        self.load_table()
        self.toast("↩ Rolled back" if had_changes else "Nothing to roll back",
                   color="#ef6c00" if had_changes else "#616161")
        self.set_status("Rolled back")

    def on_close(self):
        if self.dirty:
            ans = messagebox.askyesnocancel("Uncommitted changes", "Commit before closing?\n(No = discard)")
            if ans is None:
                return
            if ans:
                self.conn.commit()
        if self.conn:
            self.conn.close()
        self.destroy()


if __name__ == "__main__":
    App().mainloop()