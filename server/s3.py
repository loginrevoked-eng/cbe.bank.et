import os
import boto3
from botocore.config import Config as botocore_Config
from botocore.exceptions import ClientError
from .config import Config

class S3Error(Exception):
    pass

class S3Client:
    def __init__(self, config:Config):
        config = config
        self.boto_client = boto3.client(
            "s3",
            endpoint_url=config.supabase_s3_endpoint_url_s3,
            region_name=config.supabase_s3_aws_region,
            aws_access_key_id=config.credentials.supabase_s3_access_key_id,
            aws_secret_access_key=config.credentials.supabase_s3_secret_access_key,
            config=botocore_Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )
        self.pdf_bucket = config.supabase_s3_pdfs_bucket_name
        self.qrcode_bucket = config.supabase_s3_qrcodes_bucket_name

    def upload_file(self, filepath: str,  upload_type:str, destination_path: str = None):
        bucket_name = self.pdf_bucket if upload_type == "pdf" else self.qrcode_bucket if upload_type == "qrcode" else ""
        if not bucket_name:
            raise Exception("invalid upload_type")
        destination_path = destination_path or os.path.basename(filepath)
        try:
            self.boto_client.upload_file(
                Filename=filepath,
                Bucket=bucket_name,
                Key=destination_path,
                ExtraArgs={"ContentType": "image/png" if filepath.lower().endswith(".png") else "application/pdf"},
            )
        except Exception as e:
            raise S3Error(str(e))

    def get_direct_url(self, filename: str, upload_type:str, expires_in: int = 3600):
        bucket_name = self.pdf_bucket if upload_type == "pdf" else self.qrcode_bucket if upload_type == "qrcode" else ""
        try:
            key = filename
            return self.boto_client.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": bucket_name, "Key": key},
                ExpiresIn=expires_in,
            )
        except ClientError as e:
            raise S3Error(str(e))


