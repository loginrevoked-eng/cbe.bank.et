import re
import time
from dataclasses import dataclass, replace
from typing import Any, Callable, Optional

import requests
from pydantic import BaseModel

from .receipt import Receipt
from .config import Config
from .utils import Utils


@dataclass
class TemplateUnit:
    old: str
    rep: Any
    convert: Callable[[Any], str] = str

    def replace(self, text: str) -> str:
        return text.replace(self.old, self.convert(self.rep))


class Template:
    def __init__(self, text: str):
        self.text = text
        self.units: list[TemplateUnit] = []

    def add_unit(self, unit: TemplateUnit) -> None:
        self.units.append(unit)

    def add(self, old: str, rep: Any, convert: Callable[[Any], str] = str) -> "Template":
        self.add_unit(TemplateUnit(old, rep, convert))
        return self

    def render(self, use_regex: bool = True) -> str:
        if use_regex:
            return self._rg_render()
        result = self.text
        for unit in self.units:
            result = unit.replace(result)
        return result

    def _rg_render(self) -> str:
        if not self.units:
            return self.text
        replacements = {unit.old: unit.convert(unit.rep) for unit in self.units}
        # longest placeholder first so one placeholder can't shadow another
        olds = sorted(replacements, key=len, reverse=True)
        pattern = re.compile("|".join(re.escape(old) for old in olds))
        return pattern.sub(lambda match: replacements[match.group()], self.text)


def render_pdf_template(receipt: Receipt, config: Config) -> str:
    # Mask on copies so the real receipt is not changed
    sender = replace(receipt.sender)
    receiver = replace(receipt.receiver)
    sender.mask()
    receiver.mask()

    data = receipt.serialize()

    units = [
        TemplateUnit("%ASSETS_ENDPOINT%", f"https://{config.self_domain}/assets"),
        TemplateUnit("%RECEIPT_ID%", data["transaction_id"]),
        TemplateUnit("%SENDER%", data["sender_name"]),
        TemplateUnit("%SENDER_ACCOUNT%", sender.account),
        TemplateUnit("%RECEIVER%", data["receiver_name"]),
        TemplateUnit("%RECEIVER_ACCOUNT%", receiver.account),
        TemplateUnit("%DATE%", time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(data["time"]))),
        TemplateUnit("%AMOUNT%", str(data["amount"])),
        TemplateUnit("%COMMISSION%", str(data["fee_commission_amount"])),
        TemplateUnit("%VAT%", str(data["fee_vat_amount"])),
        TemplateUnit("%VAT_AMOUNT%", str(data["fee_vat_amount"])),
        TemplateUnit("%TOTAL_AMOUNT%", str(data["total_debited"])),
        TemplateUnit("%AMOUNT_WORDS%", Utils.numtoword(data["total_debited"])),
        TemplateUnit("%QR_CODE_IMG_SRC%", data["qr_text"]),
    ]
    template = Template(config.pdf_html_template_file.read_text(encoding="utf-8"))
    for unit in units:
        template.add_unit(unit)
    # single-pass render: a value that contains a placeholder is not replaced again
    return template.render(use_regex=True)

class Html2PdfError(Exception):
    pass
    
class PostBody(BaseModel):
    apikey: str
    value: Optional[str] = None


class HtmlToPdf:
    def __init__(self, api_key: str, api: str = "https://api.html2pdfrocket.com/pdf", timeout: int = 60):
        if not api_key:
            raise ValueError("HTML2pdfRocket API key is required to convert HTML to PDF")
        self.api: str = api
        self.timeout: int = timeout
        self.pdf: Optional[bytes] = None
        self.post: PostBody = PostBody(apikey=api_key)

    def convert(self, html: str) -> bool:
        try:
            self.post.value = html
            resp = requests.post(self.api, data=self.post.model_dump(), timeout=self.timeout)
            resp.raise_for_status()
            self.pdf = resp.content
            return True
        except Exception as exc:
            raise Html2PdfError(f"Error generating PDF: {exc}")
            return False

    def save(self, filename: str) -> bool:
        if self.pdf is None:
            raise Html2PdfError("Error saving PDF: nothing converted yet")
            return False
        try:
            with open(filename, "wb") as pdf_file:
                pdf_file.write(self.pdf)
            return True
        except Exception as exc:
            raise Html2PdfError("Error saving PDF: {exc}")
            return False