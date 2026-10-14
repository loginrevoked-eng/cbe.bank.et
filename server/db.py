import psycopg2
from decimal import Decimal
from .receipt import Receipt, User, Fee, TransactionFees
from dataclasses import dataclass
from .config import Config
from psycopg2 import InterfaceError, OperationalError
from typing import Optional
from time import time_ns


@dataclass
class QueryResult:
    pass

@dataclass
class QueryResultSuccess(QueryResult):    
    rows: list
    description: list

@dataclass
class QueryResultFailure(QueryResult):
    error: str

class DB:
    def __init__(self, config: config, connection_string: str = None, connect_timeout: int = 10):
        self.config = config
        self.connection_string = connection_string or self.config.credentials.neon_database_url
        self.connect_timeout = connect_timeout
        self.conn = None

    def connect(self):
        self.close()
        self.conn = psycopg2.connect(
            self.connection_string,
            connect_timeout=self.connect_timeout,
        )
        return self.conn

    def ensure_connected(self):
        if self.conn is None or self.conn.closed:
            return self.connect()
        return self.conn

    def execute(self, query: str, params=None) -> QueryResult:
        last_error = None
        for attempt in range(2):
            try:
                conn = self.ensure_connected()
            except (InterfaceError, OperationalError) as exc:
                last_error = exc
                continue

            try:
                with conn.cursor() as cur:
                    cur.execute(query, params)
                    if cur.description is not None:
                        rows = cur.fetchall()
                        description = [desc[0] for desc in cur.description]
                    else:
                        rows, description = [], []
                conn.commit()
                return QueryResultSuccess(rows=rows, description=description)

            except (InterfaceError, OperationalError) as exc:
                last_error = exc
                self.close()

            except Exception as exc:
                if not conn.closed:
                    conn.rollback()
                return QueryResultFailure(error=str(exc))

        return QueryResultFailure(error=str(last_error))

    def close(self):
        if self.conn is not None and not self.conn.closed:
            try:
                self.conn.close()
            except Exception:
                pass
        self.conn = None

class DBManager:
    # Columns match the keys returned by Receipt.serialize()
    RECEIPT_COLUMNS = {
        "transaction_id": "TEXT PRIMARY KEY",
        "amount": "NUMERIC",
        "total_debited": "NUMERIC",
        "fee_service_charge": "NUMERIC",
        "fee_vat_percentage": "NUMERIC",
        "fee_vat_amount": "NUMERIC",
        "fee_commission_percentage": "NUMERIC",
        "fee_commission_amount": "NUMERIC",
        "fee_disaster_recovery_percentage": "NUMERIC",
        "fee_disaster_recovery_amount": "NUMERIC",
        "sender_name": "TEXT",
        "sender_account": "TEXT",
        "receiver_name": "TEXT",
        "receiver_account": "TEXT",
        "time": "BIGINT",
        "reason": "TEXT",
        "qr_url": "TEXT",
        "pdf_url": "TEXT",
        "qr_text": "TEXT",
        "user_id": "TEXT"
    }

    def __init__(self, config:Config):
        self.config = config
        self.db = DB(self.config)
        self.receipts_table = self.config.receipts_db_table

    def finalize(self):
        self.db.close()

    def _run(self, query, params=None) -> QueryResultSuccess:
        result = self.db.execute(query, params)
        if isinstance(result, QueryResultFailure):
            raise RuntimeError(result.error)
        return result

    def create_table(self):
        cols_sql = ", ".join(f"{col} {col_type}" for col, col_type in self.RECEIPT_COLUMNS.items())
        self._run(f"CREATE TABLE IF NOT EXISTS {self.receipts_table} ({cols_sql})")

        # Add any columns that were introduced after the table was first created.
        # PRIMARY KEY can't be added this way, so strip it for the ALTER.
        for col, col_type in self.RECEIPT_COLUMNS.items():
            plain_type = col_type.replace("PRIMARY KEY", "").strip()
            self._run(f"ALTER TABLE {self.receipts_table} ADD COLUMN IF NOT EXISTS {col} {plain_type}")

    def initialize(self):
        self.create_table()

    def save_receipt(self, receipt: Receipt):
        data = receipt.serialize()
        columns = list(data.keys())
        values = list(data.values())

        cols_sql = ", ".join(columns)
        placeholders = ", ".join(["%s"] * len(columns))

        query = f"INSERT INTO {self.receipts_table} ({cols_sql}) VALUES ({placeholders})"

        self._run(query, values)

    def fetch_receipt(self, transaction_id):
        query = f"SELECT * FROM {self.receipts_table} WHERE transaction_id = %s"

        result = self._run(query, (transaction_id,))
        if not result.rows:
            return None

        # Row is in the flat serialize() shape; Decimal -> float
        data = {
            col: float(val) if isinstance(val, Decimal) else val
            for col, val in zip(result.description, result.rows[0])
        }

        # Rebuild the nested objects. The *_amount columns are derived
        # from amount and the percentages, so they are not needed here.
        return Receipt(
            user_id=data["user_id"],
            transaction_id=data["transaction_id"],
            amount=data["amount"],
            total_debited=data["total_debited"],
            fee=TransactionFees(
                service_charge=data["fee_service_charge"],
                vat=Fee(percentage=data["fee_vat_percentage"]),
                commission=Fee(percentage=data["fee_commission_percentage"]),
                disaster_recovery=Fee(percentage=data["fee_disaster_recovery_percentage"]),
            ),
            sender=User(name=data["sender_name"], account=data["sender_account"]),
            receiver=User(name=data["receiver_name"], account=data["receiver_account"]),
            time=data["time"],
            reason=data["reason"],
            qr_url=data["qr_url"],
            pdf_url=data["pdf_url"],
            qr_text=data["qr_text"],
        )

def _q(identifier: str) -> str:
    """Quote a Postgres identifier (needed for "Users" and the column names with spaces)."""
    return '"' + identifier.replace('"', '""') + '"'


@dataclass
class UserRecord:
    userid: str
    account: str
    balance: float
    first_name: str
    last_name: str
    default_receiver: Optional[str] = None

    def serialize(self) -> dict:
        # keys are the real column names
        return {
            "userid": self.userid,
            "account": self.account,
            "balance": self.balance,
            "first name": self.first_name,
            "last name": self.last_name,
            "default_receiver": self.default_receiver,
        }


class UsersDB:
    USER_COLUMNS = {
        "userid": "TEXT PRIMARY KEY",
        "account": "TEXT",
        "balance": "NUMERIC",
        "first name": "TEXT",
        "last name": "TEXT",
        "default_receiver": "TEXT",
    }

    def __init__(self, config: Config):
        self.config = config
        self.db = DB(self.config)
        self.users_table = "Users"

    def finalize(self):
        self.db.close()

    def _run(self, query, params=None) -> QueryResultSuccess:
        result = self.db.execute(query, params)
        if isinstance(result, QueryResultFailure):
            raise RuntimeError(result.error)
        return result

    def create_table(self):
        cols_sql = ", ".join(f"{_q(col)} {col_type}" for col, col_type in self.USER_COLUMNS.items())
        self._run(f"CREATE TABLE IF NOT EXISTS {_q(self.users_table)} ({cols_sql})")
        self._run(f'ALTER TABLE {_q(self.users_table)} ADD COLUMN IF NOT EXISTS {_q("default_receiver")} TEXT')

    def initialize(self):
        self.create_table()

    def save_user(self, user: UserRecord):
        data = user.serialize()
        cols_sql = ", ".join(_q(col) for col in data)
        placeholders = ", ".join(["%s"] * len(data))
        self._run(
            f"INSERT INTO {_q(self.users_table)} ({cols_sql}) VALUES ({placeholders})",
            list(data.values()),
        )

    def fetch_user(self, userid):
        result = self._run(
            f"SELECT * FROM {_q(self.users_table)} WHERE {_q('userid')} = %s",
            (userid,),
        )
        if not result.rows:
            return None

        # Decimal -> float, same as DBManager
        data = {
            col: float(val) if isinstance(val, Decimal) else val
            for col, val in zip(result.description, result.rows[0])
        }
        return UserRecord(
            userid=data["userid"],
            account=data["account"],
            balance=data["balance"],
            first_name=data["first name"],
            last_name=data["last name"],
            default_receiver=data.get("default_receiver"),
        )

    def update_balance(self, userid, new_balance):
        result = self._run(
            f"UPDATE {_q(self.users_table)} "
            f"SET {_q('balance')} = %s "
            f"WHERE {_q('userid')} = %s "
            f"RETURNING {_q('balance')}",
            (Decimal(str(new_balance)), userid),
        )
        if not result.rows:
            return None
        return float(result.rows[0][0])

    def set_default_receiver(self, userid, receiver_id):
        self._run(
            f"UPDATE {_q(self.users_table)} "
            f"SET {_q('default_receiver')} = %s "
            f"WHERE {_q('userid')} = %s",
            (receiver_id, userid),
        )


class RecentTransfersDB:
    """Stores the most recently used receiver for each sender."""

    TABLE = "RecentTransfers"

    def __init__(self, config: Config):
        self.db = DB(config)

    def finalize(self):
        self.db.close()

    def _run(self, query, params=None):
        result = self.db.execute(query, params)
        if isinstance(result, QueryResultFailure):
            raise RuntimeError(result.error)
        return result

    def initialize(self):
        self._run(
            f'CREATE TABLE IF NOT EXISTS {_q(self.TABLE)} ('
            '"sender_id" TEXT NOT NULL, '
            '"receiver_id" TEXT NOT NULL, '
            '"last_used" BIGINT NOT NULL, '
            'PRIMARY KEY ("sender_id", "receiver_id"))'
        )

    def record(self, sender_id: str, receiver_id: str):
        self._run(
            f'INSERT INTO {_q(self.TABLE)} ("sender_id", "receiver_id", "last_used") '
            'VALUES (%s, %s, %s) '
            'ON CONFLICT ("sender_id", "receiver_id") '
            'DO UPDATE SET "last_used" = EXCLUDED."last_used"',
            (sender_id, receiver_id, time_ns()),
        )

    def fetch(self, sender_id: str, max_count: int):
        result = self._run(
            f'SELECT r."receiver_id", u."first name", u."last name", u."account" '
            f'FROM {_q(self.TABLE)} r '
            f'JOIN {_q("Users")} u ON u."userid" = r."receiver_id" '
            'WHERE r."sender_id" = %s '
            'ORDER BY r."last_used" DESC LIMIT %s',
            (sender_id, max_count),
        )
        return [
            {
                "id": row[0],
                "name": f"{row[1] or ''} {row[2] or ''}".strip(),
                "account": row[3],
            }
            for row in result.rows
        ]
