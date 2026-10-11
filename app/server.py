import os
import requests
import datetime
from pathlib import Path
try:
    from .s3 import S3Client
    from .db import DBManager
    from .config import Config
    from .receipt import Receipt, ReceiptIn
except ImportError:
    from s3 import S3Client
    from db import DBManager
    from config import Config
    from receipt import Receipt, ReceiptIn
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import Response, HTMLResponse, FileResponse, RedirectResponse




Config.load("configuration.json")


s3_client = S3Client()
db_manager = DBManager()

app = FastAPI()
app.mount("/assets", StaticFiles(directory=Path(__file__).resolve().parent.parent / "assets"), name="assets")
static_dir = Path(__file__).resolve().parent.parent / "static"
if static_dir.is_dir():
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.on_event("startup")
def startup_event():
    db_manager.create_receipts_table()


@app.on_event("shutdown")
def shutdown_event():
    db_manager.close()



@app.post("/generate-receipt")
async def generate_mobile_receipt(receipt_in:ReceiptIn):
    receipt = Receipt(receipt_in)
    pdf_path = receipt.write_pdf()
    qr_path = receipt.write_qrimg()
    
    if pdf_path is None:
        raise HTTPException(status_code=500, detail="Failed to generate PDF")

    s3_client.upload_file(pdf_path)
    s3_client.upload_file(qr_path)
    receipt.pdf_url = s3_client.get_direct_url(pdf_path)
    receipt.qr_url = s3_client.get_direct_url(qr_path)
    
    os.remove(pdf_path)
    os.remove(qr_path)
    
    db_manager.save_receipt(receipt)

    return {"status":"success", "txn-id":receipt.txn_id}


@app.get("/api/transactions/{txnID}")
async def get_transaction(txnID: str):
    receipt = db_manager.fetch_receipt(txnID)
    if receipt is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return receipt.serialize()
