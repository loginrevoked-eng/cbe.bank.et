import time
import base64
import hashlib
import hmac
import secrets
import qrcode
from pydantic import BaseModel
from typing import Any, Dict, Optional
from dataclasses import dataclass, field, replace

@dataclass
class User:
    name: str
    account: str
    masked:bool = False

    def mask(self) -> None:
        if not self.masked and self.account:
            visible = self.account[:4]
            self.account = visible + "*" * max(len(self.account) - 4, 0)
            self.masked = True


@dataclass
class Fee:
    percentage: float

    def calculate(self, num: float) -> float:
        return self.percentage * num


@dataclass
class TransactionFees:
    service_charge: float = 0.50
    vat: Fee = field(default_factory=lambda: Fee(0.015))
    commission: Fee = field(default_factory=lambda: Fee(0.00))
    disaster_recovery: Fee = field(default_factory=lambda: Fee(0.03))

    def calculate_fees(self, amount: float) -> float:
        total = self.service_charge
        total += self.vat.calculate(amount)
        total += self.commission.calculate(amount)
        total += self.disaster_recovery.calculate(amount)
        return total


class ReceiptRequest(BaseModel):
    user_id:str
    receiver_id: Optional[str] = None
    amount: float
    sender: User
    receiver: User
    reason: Optional[str] = None


@dataclass
class Receipt:
    user_id:str
    transaction_id: str
    amount: float
    total_debited: float
    fee: TransactionFees
    sender: User
    receiver: User
    time: int
    reason: Optional[str]
    qr_url: str
    pdf_url: str
    qr_text: str

    def serialize(self) -> Dict[str, Any]:
        return {
            "transaction_id": self.transaction_id,
            "amount": self.amount,
            "total_debited": self.fee.calculate_fees(self.amount) + self.amount,
            "fee_service_charge": self.fee.service_charge,
            "fee_vat_percentage": self.fee.vat.percentage,
            "fee_vat_amount": self.fee.vat.calculate(self.amount),
            "fee_commission_percentage": self.fee.commission.percentage,
            "fee_commission_amount": self.fee.commission.calculate(self.amount),
            "fee_disaster_recovery_percentage": self.fee.disaster_recovery.percentage,
            "fee_disaster_recovery_amount": self.fee.disaster_recovery.calculate(self.amount),
            "sender_name": self.sender.name,
            "sender_account": self.sender.account,
            "receiver_name": self.receiver.name,
            "receiver_account": self.receiver.account,
            "time": self.time,
            "reason": self.reason or "Mobile Transfer",
            "qr_url": self.qr_url,
            "pdf_url": self.pdf_url,
            "qr_text": self.qr_text,
            "user_id":self.user_id
        }

    def to_client(self) -> Dict[str, str]:
        return {
            key: "" if value is None else str(value)
            for key, value in self.serialize().items()
        }

    def qrcode(self, path: Optional[str] = None) -> "PIL.Image.Image":
        img = qrcode.make(self.qr_text)
        if path is not None:
            img.save(path)
        return img


    @classmethod
    def from_request(
        cls,
        request: ReceiptRequest,
        fees: TransactionFees,
        secret: str,
        qr_url: str = "",
        pdf_url: str = "",
        qr_text: Optional[str] = None,
        transaction_id_prefix:str=""
    ) -> "Receipt":
        r = cls(
            transaction_id="",
            amount=request.amount,
            total_debited=request.amount + fees.calculate_fees(request.amount),
            fee=fees,
            sender=replace(request.sender),
            receiver=replace(request.receiver),
            time=int(time.time()),
            reason=request.reason,
            qr_url=qr_url,
            pdf_url=pdf_url,
            qr_text="",
            user_id=request.user_id
        )
        r.generate_transaction_id(secret, transaction_id_prefix)
        return r

    def generate_transaction_id(self, secret: str, prefix:str="") -> str:
        message = "|".join((
            self.sender.account,
            self.receiver.account,
            f"{self.amount:.2f}",
            str(self.time),
            secrets.token_hex(8),
        ))
        digest = hmac.new(secret.encode(), message.encode(), hashlib.sha256).digest()
        self.transaction_id = prefix + base64.b32encode(digest).decode()[:14 - len(prefix)]
        return self.transaction_id

    def pdf_file(self) -> str:
        return f"{self.transaction_id}.pdf"

    def qr_file(self) -> str:
        return f"{self.transaction_id}.png"
    
