from dataclasses import dataclass, field
from dotenv import load_dotenv
import os
import json
from typing import List
from pathlib import Path

CONFIG = None


@dataclass
class Credentials:
    receipt_id_generation_secret: str | None = None
    html2pdf_api_key: str | None = None
    supabase_s3_access_key_id: str | None = None
    supabase_s3_secret_access_key: str | None = None
    neon_database_url: str | None = None

    @classmethod
    def load(cls, env_filepath: str = ".env"):
        load_dotenv(env_filepath)
        credentials = cls()
        for attr in (
            "receipt_id_generation_secret",
            "html2pdf_api_key",
            "supabase_s3_access_key_id",
            "supabase_s3_secret_access_key",
            "neon_database_url",
        ):
            setattr(credentials, attr, os.getenv(attr.upper(), getattr(credentials, attr)))
        credentials.validate()
        return credentials

    def validate(self):
        not_set: List[str] = [
            attr.upper()
            for attr in (
                "receipt_id_generation_secret",
                "html2pdf_api_key",
                "supabase_s3_access_key_id",
                "supabase_s3_secret_access_key",
                "neon_database_url",
            )
            if not getattr(self, attr)
        ]
        if not_set:
            raise ValueError(f"The following credentials are not set: {', '.join(not_set)}")


@dataclass
class Config:
    pdf_html_template_file: Path
    self_domain: str = "localhost"
    mobile_receipt_gen_endpoint: str = "/generate-mobile-receipt"
    qr_code_size: str = "150x150"
    pdf_baseurl: str = "https://%DOMAIN%/receipts/pdf"
    qrcode_baseurl: str = "https://api.qrserver.com/v1/create-qr-code"
    mobile_receipt_html_template_filename: str | None = None
    receipt_pdf_html_template_filename: str | None = None
    html2pdf_api_url: str = "https://api.html2pdfrocket.com/pdf"
    supabase_s3_bucket_name: str = "receipt_pdfs"
    supabase_s3_endpoint_url_s3: str = "https://imjyodtjkxfeuduamnab.storage.supabase.co/storage/v1/s3"
    supabase_s3_aws_region: str = "us-east-2"
    receipts_db_table: str = "receipts"
    receipt_form_html_filename: str | None = None
    credentials: Credentials = field(default_factory=Credentials.load)

    def __post_init__(self):
        self.pdf_html_template_file = Path(self.pdf_html_template_file)
        self.pdf_baseurl = self.pdf_baseurl.replace("%DOMAIN%", self.self_domain)

    def from_dict(self, **kwargs):
        for key, value in kwargs.items():
            if hasattr(self, key):
                if key == "pdf_html_template_file":
                    value = Path(value)
                setattr(self, key, value)
        return self

    def from_json(self, json_filename: str):
        with open(json_filename, "r", encoding="utf-8") as f:
            data = json.load(f)
        return self.from_dict(**data)

    @classmethod
    def load(cls, file: str, envfile: str = ".env"):
        load_dotenv(envfile)
        config_path = Path(file)
        if not config_path.exists():
            config_path = Path(__file__).resolve().parent.parent / config_path
        with config_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        env_path = Path(envfile)
        if not env_path.exists():
            env_path = config_path.parent / env_path
        if "pdf_html_template_file" not in data:
            data["pdf_html_template_file"] = data.get("receipt_pdf_html_template_filename")
        template_path = Path(data["pdf_html_template_file"])
        if not template_path.is_absolute():
            data["pdf_html_template_file"] = config_path.parent / template_path
        data["credentials"] = Credentials.load(str(env_path))
        global CONFIG
        CONFIG = cls(**data)
        return CONFIG
