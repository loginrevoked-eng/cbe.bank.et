import psycopg2
from psycopg2 import InterfaceError, OperationalError
try:
    from . import config as config_module
    from .receipt import Receipt
except ImportError:
    import config as config_module
    from receipt import Receipt


class DBManager:
    RECEIPT_COLUMNS = {
        "receipt_id": "TEXT PRIMARY KEY",
        "sender_name": "TEXT",
        "receiver_name": "TEXT",
        "sender_account": "TEXT",
        "receiver_account": "TEXT",
        "txn_qrcode_url": "TEXT",
        "txn_pdf_url": "TEXT",
        "amount": "NUMERIC",
        "epoch_time": "BIGINT",
        "vat": "NUMERIC",
        "commission": "NUMERIC",
        "total_amount": "NUMERIC",
    }

    def __init__(self, **kwargs):
        self.config = config_module.CONFIG
        self.connection_string = kwargs.get("connection_string") or self.config.credentials.neon_database_url
        self.db_conn = None
        self.receipts_table = kwargs.get("receipts_table") or self.config.receipts_db_table
        self.connect_timeout = kwargs.get("connect_timeout", 10)

    def _connect(self):
        self.db_conn = psycopg2.connect(
            self.connection_string,
            connect_timeout=self.connect_timeout,
        )
        return self.db_conn

    def _ensure_connection(self):
        if self.db_conn is None or self.db_conn.closed:
            return self._connect()
        return self.db_conn

    def close(self):
        if self.db_conn is not None and not self.db_conn.closed:
            self.db_conn.close()
        self.db_conn = None

    def _run(self, query, params=None, fetchone=False):
        last_error = None
        for attempt in range(2):
            conn = self._ensure_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute(query, params)
                    result = cur.fetchone() if fetchone else None
                conn.commit()
                return result
            except (InterfaceError, OperationalError) as exc:
                last_error = exc
                self.close()
                if attempt == 0:
                    continue
                raise
            except Exception:
                if conn is not None and not conn.closed:
                    conn.rollback()
                raise
        if last_error is not None:
            raise last_error

    def create_table(self, table_name=None, **kwargs):
        table_name = table_name or self.receipts_table
        columns = kwargs or self.RECEIPT_COLUMNS
        cols_sql = ", ".join(f"{col} {col_type}" for col, col_type in columns.items())
        query = f"CREATE TABLE IF NOT EXISTS {table_name} ({cols_sql})"

        self._run(query)

    def create_receipts_table(self):
        """Convenience wrapper that builds the table matching Receipt.to_dict()."""
        self.create_table(self.receipts_table, **self.RECEIPT_COLUMNS)

    def save_receipt(self, receipt: Receipt):
        data = receipt.to_dict()
        columns = list(data.keys())
        values = list(data.values())

        cols_sql = ", ".join(columns)
        placeholders = ", ".join(["%s"] * len(columns))

        query = f"INSERT INTO {self.receipts_table} ({cols_sql}) VALUES ({placeholders})"

        self._run(query, values)

    def fetch_receipt(self, receipt_id):
        query = f"SELECT * FROM {self.receipts_table} WHERE receipt_id = %s"

        conn = self._ensure_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(query, (receipt_id,))
                row = cur.fetchone()
                if row is None:
                    return None
                columns = [desc[0] for desc in cur.description]
        except (InterfaceError, OperationalError):
            self.close()
            conn = self._ensure_connection()
            with conn.cursor() as cur:
                cur.execute(query, (receipt_id,))
                row = cur.fetchone()
                if row is None:
                    return None
                columns = [desc[0] for desc in cur.description]

        data = dict(zip(columns, row))
        return Receipt(**data)
