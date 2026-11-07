from pathlib import Path

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

from .config import Config
from .db import DBManager
from .pdf import HtmlToPdf, render_pdf_template, Html2PdfError
from .receipt import Receipt, ReceiptRequest, TransactionFees, User
from .s3 import S3Client, S3Error
from .db import DBManager, UsersDB, UserRecord, RecentTransfersDB
from .models import (
    AccountLookupAutocompleteRequest,
    AccountLookupAutocompleteResponse,
    AccountLookupResult,
)




config = Config.load("configuration.json")
s3_client = S3Client(config)
db_manager = DBManager(config)
users = UsersDB(config)
recent_transfers = RecentTransfersDB(config)
converter = HtmlToPdf(config.credentials.html2pdf_api_key)
app = FastAPI()


class SPAStaticFiles(StaticFiles):
    """Serve the Vite entry point for client-side routes on direct navigation."""

    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code != 404:
                raise
            return FileResponse(Path(self.all_directories[0]) / "index.html")





@app.on_event("shutdown")
def shutdown_event():
    db_manager.finalize()
    users.finalize()
    recent_transfers.finalize()




@app.post("/api/generate-receipt")
def generate_receipt(receipt_in: ReceiptRequest):
    sender = users.fetch_user(receipt_in.user_id)
    if sender is None:
        raise HTTPException(status_code=404, detail=f"User {receipt_in.user_id} not found")
    receipt_in.sender.account = sender.account
    receipt_in.sender.name = f"{sender.first_name} {sender.last_name}".strip()

    if receipt_in.receiver_id:
        receiver = users.fetch_user(receipt_in.receiver_id)
        if receiver is None:
            raise HTTPException(status_code=404, detail=f"Receiver {receipt_in.receiver_id} not found")
        receipt_in.receiver.account = receiver.account
        receipt_in.receiver.name = f"{receiver.first_name} {receiver.last_name}".strip()

    receipt = Receipt.from_request(
        receipt_in,
        TransactionFees(),
        config.credentials.receipt_id_generation_secret,
        transaction_id_prefix="FT",
    )
    pdf_path = receipt.pdf_file()
    qr_path = receipt.qr_file()

    try:
        converter.convert(render_pdf_template(receipt, config))
        converter.save(pdf_path)

        s3_client.upload_file(pdf_path, "pdf")
        receipt.pdf_url = s3_client.get_direct_url(pdf_path, "pdf")
        receipt.qr_text = receipt.pdf_url
        receipt.qrcode(path=qr_path)
        s3_client.upload_file(qr_path, "qrcode")
        receipt.qr_url = s3_client.get_direct_url(qr_path, "qrcode")

    except (Html2PdfError, S3Error) as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        Path(pdf_path).unlink(missing_ok=True)
        Path(qr_path).unlink(missing_ok=True)

    db_manager.save_receipt(receipt)
    current_balance = users.update_balance(receipt.user_id, -receipt.total_debited)
    if receipt_in.receiver_id:
        recent_transfers.record(receipt_in.user_id, receipt_in.receiver_id)
    return {"status": "success", "current_balance":current_balance, "transaction_id": receipt.transaction_id}


@app.get("/api/transactions/{transaction_id}")
def get_transaction(transaction_id: str):
    receipt = db_manager.fetch_receipt(transaction_id)
    if receipt is None:
        raise HTTPException(status_code=404, detail=f"Receipt for transaction {transaction_id} not found")
    #receipt.sender.mask()
    #receipt.receiver.mask()
    receipt.qr_url = s3_client.get_direct_url(receipt.qr_file(), "qrcode")
    receipt.pdf_url = s3_client.get_direct_url(receipt.pdf_file(), "pdf")
    return receipt.to_client()


@app.get("/api/users/{user_id}")
def get_user(user_id: str):
    user = users.fetch_user(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    account = User(name="", account=user.account)
    #account.mask()
    return {
        "userid": user.userid,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": f"{user.first_name} {user.last_name}".strip(),
        "account": account.account,
        "balance": user.balance,
    }

@app.websocket("/ws/accountlookup/{user_id}")
async def account_lookup(ws: WebSocket, user_id: str):
    await ws.accept()

    if users.fetch_user(user_id) is None:
        await ws.close(code=1008, reason="User not found")
        return

    try:
        while True:
            payload = await ws.receive_json()
            try:
                request = AccountLookupAutocompleteRequest.parse_obj(payload)
            except ValidationError:
                await ws.close(code=1003, reason="Invalid account lookup request")
                return

            if request.account and not request.name:
                matches = users.findaccalike(request.account, request.max_accs, exclude_userid=user_id)
            elif request.name and not request.account:
                matches = users.finduseralike(request.name, request.max_accs, exclude_userid=user_id)
            else:
                matches = []
            response = AccountLookupAutocompleteResponse(
                request_id=request.request_id,
                lookup_result=AccountLookupResult(found=len(matches), users=matches),
            )
            await ws.send_json(response.dict())
    except WebSocketDisconnect:
        return

@app.get("/api/{user_id}/recent_transfers/{max_count}")
def get_recent_transfers(user_id: str, max_count: int):
    if users.fetch_user(user_id) is None:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    return recent_transfers.fetch(user_id, max(1, min(max_count, 100)))


# Keep this mount after the API routes so /api requests continue to reach FastAPI.
site_dist = Path(__file__).resolve().parent.parent / "site" / "dist"
app.mount("/", SPAStaticFiles(directory=str(site_dist), html=True), name="site")
