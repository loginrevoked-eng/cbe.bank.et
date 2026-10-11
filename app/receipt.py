import hashlib
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import qrcode
import requests
from pydantic import BaseModel, Field

try:
    from . import config as config_module
    from .template import Template, TemplateUnit
    from .utils import Utils
except ImportError:
    import config as config_module
    from template import Template, TemplateUnit
    from utils import Utils


class Entity(BaseModel):
    name: str
    account: str


class Fee(BaseModel):
    percentage: float = 0.0
    amount: float = 0.0


class TransactionFees(BaseModel):
    vat: Fee | None = None
    commission: Fee | None = None
    disaster_recovery: Fee | None = None


class ReceiptIn(BaseModel):
    amount: float
    sender: Entity
    receiver: Entity
    fees: TransactionFees = Field(default_factory=TransactionFees)


@dataclass
class Receipt:
    """A receipt uses the API's nested shape and owns its generated metadata."""

    amount: float
    sender: Entity
    receiver: Entity
    fees: TransactionFees
    txn_id: str
    epoch_time: int
    total_debited: float
    pdf_url: str
    qr_url: str | None = None

    def __init__(self, receipt: ReceiptIn | dict[str, Any] | None = None, **stored: Any):
        self.config = config_module.CONFIG
        if stored:
            # Rehydrate the older database column names without changing the API model.
            self.amount = float(stored.get("amount", 0))
            self.sender = Entity(name=stored.get("sender_name", ""), account=stored.get("sender_account", ""))
            self.receiver = Entity(name=stored.get("receiver_name", ""), account=stored.get("receiver_account", ""))
            self.fees = TransactionFees(
                vat=Fee(amount=float(stored.get("vat", 0))),
                commission=Fee(amount=float(stored.get("commission", 0))),
            )
            self.txn_id = stored.get("receipt_id", "")
            self.epoch_time = int(stored.get("epoch_time", 0))
            self.total_debited = float(stored.get("total_amount", self.amount))
            self.pdf_url = stored.get("txn_pdf_url", "")
            self.qr_url = stored.get("txn_qrcode_url")
            self.pdf_html = None
            return

        if isinstance(receipt, dict) and "receipt_id" in receipt:
            stored = receipt
            self.amount = float(stored.get("amount", 0))
            self.sender = Entity(name=stored.get("sender_name", ""), account=stored.get("sender_account", ""))
            self.receiver = Entity(name=stored.get("receiver_name", ""), account=stored.get("receiver_account", ""))
            self.fees = TransactionFees(
                vat=Fee(amount=float(stored.get("vat", 0))),
                commission=Fee(amount=float(stored.get("commission", 0))),
            )
            self.txn_id = stored.get("receipt_id", "")
            self.epoch_time = int(stored.get("epoch_time", 0))
            self.total_debited = float(stored.get("total_amount", self.amount))
            self.pdf_url = stored.get("txn_pdf_url", "")
            self.qr_url = stored.get("txn_qrcode_url")
            self.pdf_html = None
            return

        payload = receipt if isinstance(receipt, ReceiptIn) else ReceiptIn.parse_obj(receipt or {})
        self.amount = payload.amount
        self.sender = payload.sender
        self.receiver = payload.receiver
        self.fees = payload.fees
        self.epoch_time = int(time.time())
        self.total_debited = self.amount + sum(
            fee.amount for fee in (self.fees.vat, self.fees.commission, self.fees.disaster_recovery) if fee
        )
        secret = self.config.credentials.receipt_id_generation_secret or ""
        self.txn_id = hashlib.sha256(f"{secret}_{self.epoch_time}".encode()).hexdigest()[:16].upper()
        self.pdf_url = f"{self.config.pdf_baseurl}/{self.txn_id}.pdf"
        self.qr_url = None
        self.pdf_html = self._render_pdf()

    @property
    def qr_text(self) -> str:
        return self.pdf_url

    @property
    def receipt_id(self) -> str:
        return self.txn_id

    @property
    def vat(self) -> float:
        return self.fees.vat.amount if self.fees.vat else 0.0

    @property
    def commission(self) -> float:
        return self.fees.commission.amount if self.fees.commission else 0.0

    def to_dict(self) -> dict[str, Any]:
        """Return the stable column mapping used by DBManager.RECEIPT_COLUMNS."""
        return {
            "receipt_id": self.txn_id,
            "sender_name": self.sender.name,
            "receiver_name": self.receiver.name,
            "sender_account": self.sender.account,
            "receiver_account": self.receiver.account,
            "txn_qrcode_url": self.qr_url or "",
            "txn_pdf_url": self.pdf_url,
            "amount": self.amount,
            "epoch_time": self.epoch_time,
            "vat": self.vat,
            "commission": self.commission,
            "total_amount": self.total_debited,
        }

    def serialize(self) -> dict[str, Any]:
        def string_values(value: Any) -> Any:
            if isinstance(value, dict):
                return {key: string_values(item) for key, item in value.items()}
            if value is None:
                return ""
            return str(value)

        return {
            "amount": str(self.amount),
            "sender": string_values(self.sender.dict()),
            "receiver": string_values(self.receiver.dict()),
            "fees": string_values(self.fees.dict()),
            "txn_id": str(self.txn_id),
            "qr_text": str(self.qr_text),
            "pdf_url": str(self.pdf_url),
            "qr_url": str(self.qr_url or ""),
            "total_debited": str(self.total_debited),
            "epoch_time": str(self.epoch_time),
        }

    def _render_pdf(self) -> str:
        units = [
            TemplateUnit("{{ASSETS_ENDPOINT}}", f"https://{self.config.self_domain}/assets"),
            TemplateUnit("{{RECEIPT_ID}}", self.txn_id),
            TemplateUnit("{{SENDER}}", self.sender.name),
            TemplateUnit("{{SENDER_ACCOUNT}}", Utils.mask_account(self.sender.account)),
            TemplateUnit("{{RECEIVER}}", self.receiver.name),
            TemplateUnit("{{RECEIVER_ACCOUNT}}", Utils.mask_account(self.receiver.account)),
            TemplateUnit("{{DATE}}", time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(self.epoch_time))),
            TemplateUnit("{{AMOUNT}}", self.amount),
            TemplateUnit("{{COMMISSION}}", self.commission),
            TemplateUnit("{{VAT}}", self.vat),
            TemplateUnit("{{VAT_AMOUNT}}", self.vat),
            TemplateUnit("{{TOTAL_AMOUNT}}", self.total_debited),
            TemplateUnit("{{AMOUNT_WORDS}}", Utils.numtoword(self.total_debited)),
            TemplateUnit("{{QR_CODE_IMG_SRC}}", self.qr_text),
        ]
        template = Template(self.config.pdf_html_template_file.read_text(encoding="utf-8"))
        for unit in units:
            template.add_unit(unit)
        return template.render(use_regex=False)

    def write_pdf(self) -> str | None:
        try:
            path = f"{self.txn_id}.pdf"
            response = requests.post(
                self.config.html2pdf_api_url,
                data={"apikey": self.config.credentials.html2pdf_api_key, "value": self.pdf_html},
            )
            response.raise_for_status()
            Path(path).write_bytes(response.content)
            return path
        except Exception as exc:
            print(f"Error generating PDF: {exc}")
            return None

    def write_qrimg(self) -> str:
        path = f"{self.txn_id}.png"
        qrcode.make(self.qr_text).save(path)
        return path
