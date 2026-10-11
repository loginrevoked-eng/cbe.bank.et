import os
import boto3
from botocore.config import Config as botocore_Config
from botocore.exceptions import ClientError
try:
    from . import config as config_module
except ImportError:
    import config as config_module


class S3Client:
    def __init__(self, **kwargs):
        config = config_module.CONFIG
        self.boto_client = boto3.client(
            "s3",
            endpoint_url=config.supabase_s3_endpoint_url_s3,
            region_name=config.supabase_s3_aws_region,
            aws_access_key_id=config.credentials.supabase_s3_access_key_id,
            aws_secret_access_key=config.credentials.supabase_s3_secret_access_key,
            config=botocore_Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )
        self.bucket_name = config.supabase_s3_bucket_name

    def upload_file(self, filepath: str, destination_path: str = None):
        destination_path = destination_path or os.path.basename(filepath)
        try:
            self.boto_client.upload_file(
                Filename=filepath,
                Bucket=self.bucket_name,
                Key=destination_path,
                ExtraArgs={"ContentType": "image/png" if filepath.lower().endswith(".png") else "application/pdf"},
            )
            print(f"Success! Uploaded directly to Supabase via S3: {self.bucket_name}/{destination_path}")
        except Exception as e:
            print("S3 Upload failed:", e)

    def get_direct_url(self, filename: str, expires_in: int = 3600):
        try:
            key = filename
            return self.boto_client.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": self.bucket_name, "Key": key},
                ExpiresIn=expires_in,
            )
        except ClientError as e:
            print("Failed to generate presigned URL:", e)
            return None


if __name__ == "__main__":
    s3 = S3Client()
    s3.upload_file(
        filepath="../app.js",
        destination_path="uploads/app.js.pdf",
    )
