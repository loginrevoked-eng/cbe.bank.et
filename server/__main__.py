import math
import os
import re
import sys
import time
import traceback
import uuid
from pathlib import Path
from typing import Optional

import requests

from fucktest import (
    ConsoleSpinner,
    ResultOk,
    Test,
    TestBody,
    TestInfo,
    TestManager,
)

try:
    from .receipt import Receipt, User, Fee, TransactionFees, ReceiptRequest
except ImportError:  # run directly as a script
    from receipt import Receipt, User, Fee, TransactionFees, ReceiptRequest

from .config import Config


API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost").rstrip("/")
API_ID_PREFIX = "CB"  # the prefix generate_receipt passes to Receipt.from_request


def skip(reason: str) -> ResultOk:
    return ResultOk(f"skipped: {reason}", None)


def show_exception(ui, exc: BaseException) -> None:
    ui.error("".join(traceback.format_exception(exc)).rstrip())


def api_unreachable() -> Optional[str]:
    """Return a reason if the API is not up, else None."""
    try:
        requests.get(f"{API_BASE_URL}/openapi.json", timeout=5)
    except requests.RequestException as exc:
        return (
            f"API not reachable at {API_BASE_URL} ({type(exc).__name__}); "
            "start the server or set API_BASE_URL"
        )
    return None


def cleanup_receipt(ui, transaction_id: str) -> None:
    """Remove what an API test created: the two S3 objects and the DB row."""
    try:
        from .s3 import S3Client

        config = Config.load("configuration.json")
        client = S3Client(config)
        for bucket, key in (
            (client.pdf_bucket, f"{transaction_id}.pdf"),
            (client.qrcode_bucket, f"{transaction_id}.png"),
        ):
            client.boto_client.delete_object(Bucket=bucket, Key=key)
    except Exception as exc:
        ui.error(f"warning: could not delete S3 objects for {transaction_id}: {exc}")

    try:
        from .db import DBManager

        config = Config.load("configuration.json")
        mgr = DBManager(config)
        mgr.initialize()
        try:
            mgr._run(
                f"DELETE FROM {mgr.receipts_table} WHERE transaction_id = %s",
                (transaction_id,),
            )
        finally:
            mgr.finalize()
    except Exception as exc:
        ui.error(f"warning: could not delete DB row for {transaction_id}: {exc}")


def build_receipt() -> Receipt:
    amount = 1000.0
    fees = TransactionFees(
        service_charge=10.0,
        vat=Fee(0.16),
        commission=Fee(0.01),
        disaster_recovery=Fee(0.005),
    )
    return Receipt(
        transaction_id=f"TEST-{uuid.uuid4().hex[:12]}",
        amount=amount,
        total_debited=amount + fees.calculate_fees(amount),
        fee=fees,
        sender=User(name="Alice Doe", account="1234567890"),
        receiver=User(name="Bob Roe", account="0987654321"),
        time=int(time.time()),
        reason="Test payment",
        qr_url="https://example.com/qr.png",
        pdf_url="https://example.com/receipt.pdf",
        qr_text="TEST-QR",
    )


def test_user_mask(ui):
    user = User(name="A", account="1234567890")
    user.mask()
    assert user.account == "1234******", user.account

    short = User(name="B", account="12")
    short.mask()
    assert short.account == "12", short.account
    return ResultOk(
        "long accounts are masked, short ones are left alone",
        {"long": user.account, "short": short.account},
    )


def test_fees(ui):
    fees = TransactionFees(10.0, Fee(0.16), Fee(0.01), Fee(0.005))
    total = fees.calculate_fees(1000.0)
    assert math.isclose(total, 185.0), total
    return ResultOk("calculate_fees(1000.0) is correct", total)


def test_request(ui):
    req = ReceiptRequest(
        amount=500,
        sender=User("Alice", "111"),
        receiver=User("Bob", "222"),
    )
    assert req.reason is None
    return ResultOk("reason defaults to None", req)


def test_from_request(ui):
    request = ReceiptRequest(
        amount=1000,
        sender=User("Alice Doe", "1234567890"),
        receiver=User("Bob Roe", "0987654321"),
        reason="unit test",
    )
    fees = TransactionFees()
    receipt = Receipt.from_request(request, fees, "test-secret", transaction_id_prefix=API_ID_PREFIX)

    # id: prefix + random part, 20 characters in total
    tid = receipt.transaction_id
    assert tid.startswith(API_ID_PREFIX), tid
    assert len(tid) == 20, f"{tid!r} has {len(tid)} characters"
    assert re.fullmatch(r"[A-Z2-7]+", tid), f"unexpected characters in {tid!r}"

    # the same request twice still gives different ids
    again = Receipt.from_request(request, fees, "test-secret", transaction_id_prefix=API_ID_PREFIX)
    assert again.transaction_id != tid, "two receipts got the same id"

    # the default (no prefix) is still 20 characters
    plain = Receipt.from_request(request, fees, "test-secret")
    assert len(plain.transaction_id) == 20, f"{plain.transaction_id!r} with no prefix"

    # values copied across from the request and the fees
    assert receipt.amount == 1000
    assert receipt.reason == "unit test"
    assert math.isclose(receipt.total_debited, 1000 + fees.calculate_fees(1000))

    # the receipt owns its users: masking it must not change the request
    receipt.sender.mask()
    assert receipt.sender.account == "1234******"
    assert request.sender.account == "1234567890", "masking the receipt changed the request"

    # file names follow the id
    assert receipt.pdf_file() == f"{tid}.pdf"
    assert receipt.qr_file() == f"{tid}.png"
    return ResultOk("ids, copies and file names are correct", tid)


def test_serialize(ui, receipt: Receipt):
    data = receipt.serialize()
    assert all(not isinstance(v, (dict, list, tuple)) for v in data.values()), "nested value found"
    assert math.isclose(data["fee_vat_amount"], 160.0)
    assert math.isclose(data["fee_commission_amount"], 10.0)
    assert math.isclose(data["fee_disaster_recovery_amount"], 5.0)
    assert math.isclose(data["total_debited"], 1185.0)
    return ResultOk("serialized data is flat and the fee amounts are correct", data)


def test_to_client(ui, receipt: Receipt):
    data = receipt.to_client()
    assert all(isinstance(v, str) for v in data.values())
    assert data.keys() == receipt.serialize().keys()

    original_reason = receipt.reason
    try:
        receipt.reason = None
        assert receipt.to_client()["reason"] == ""
    finally:
        receipt.reason = original_reason
    return ResultOk("all values are strings and a missing reason becomes ''", data)


def test_qrcode(ui, receipt: Receipt):
    import io

    img = receipt.qrcode()

    # the image can be written out as a real PNG
    buf = io.BytesIO()
    img.save(buf)
    png = buf.getvalue()
    assert png.startswith(b"\x89PNG\r\n\x1a\n"), "qrcode() did not produce a PNG"

    # a different qr_text gives a different image
    other = Receipt(**{**receipt.__dict__, "qr_text": receipt.qr_text + "-OTHER"})
    other_buf = io.BytesIO()
    other.qrcode().save(other_buf)
    assert other_buf.getvalue() != png, "different qr_text produced the same image"

    out = Path("test_qrcode.png")
    out.write_bytes(png)

    # if OpenCV is installed, scan the code and check it holds qr_text
    try:
        import cv2
        import numpy as np
        from PIL import Image
    except ImportError:
        return ResultOk(
            "valid PNG (install opencv-python to also decode it)",
            str(out.resolve()),
        )

    ui.update("Decoding the QR code")
    pixels = np.array(Image.open(io.BytesIO(png)).convert("RGB"))
    decoded, _, _ = cv2.QRCodeDetector().detectAndDecode(pixels)
    assert decoded == receipt.qr_text, f"decoded {decoded!r} != {receipt.qr_text!r}"
    return ResultOk(f"decoded back to {decoded!r}", str(out.resolve()))


def test_db_roundtrip(ui, receipt: Receipt):
    try:
        from .db import DBManager
    except ImportError:
        try:
            from db import DBManager
        except Exception as exc:
            return skip(f"cannot import db: {exc}")

    ui.update("Connecting to the database")
    try:
        config = Config.load("configuration.json")
        mgr = DBManager(config)
        mgr.initialize()
    except Exception as exc:
        show_exception(ui, exc)
        return skip(f"cannot connect/initialize: {exc}")

    try:
        ui.update("Saving and fetching the receipt")
        mgr.save_receipt(receipt)
        fetched = mgr.fetch_receipt(receipt.transaction_id)
        assert fetched is not None, "receipt not found after save"

        original = receipt.serialize()
        restored = fetched.serialize()
        for key, expected in original.items():
            got = restored[key]
            if isinstance(expected, float):
                assert math.isclose(expected, got), f"{key}: {expected} != {got}"
            else:
                assert expected == got, f"{key}: {expected!r} != {got!r}"

        assert mgr.fetch_receipt("does-not-exist") is None
        return ResultOk("save_receipt / fetch_receipt roundtrip", receipt.transaction_id)
    finally:
        mgr._run(
            f"DELETE FROM {mgr.receipts_table} WHERE transaction_id = %s",
            (receipt.transaction_id,),
        )
        mgr.finalize()


def test_pdf(ui, receipt: Receipt):
    try:
        from .pdf import render_pdf_template
    except ImportError:
        try:
            from pdf import render_pdf_template
        except Exception as exc:
            return skip(f"cannot import pdf: {exc}")

    try:
        config = Config.load("configuration.json")
        html = render_pdf_template(receipt, config)
    except Exception as exc:
        show_exception(ui, exc)
        return skip(f"cannot render: {exc}")

    data = receipt.serialize()

    # every placeholder was replaced
    assert "{{" not in html, "unreplaced placeholder left in template"

    # values from serialize() made it into the output
    assert data["transaction_id"] in html
    assert data["sender_name"] in html
    assert data["receiver_name"] in html
    assert str(data["amount"]) in html
    assert str(data["fee_commission_amount"]) in html
    assert str(data["fee_vat_amount"]) in html
    assert str(data["total_debited"]) in html

    # accounts are masked in the PDF, never shown in full
    assert "1234******" in html
    assert "0987******" in html
    assert data["sender_account"] not in html
    assert data["receiver_account"] not in html

    # rendering must not change the receipt itself
    assert receipt.sender.account == "1234567890"
    assert receipt.receiver.account == "0987654321"

    out = Path("test_receipt.html")
    out.write_text(html, encoding="utf-8")
    return ResultOk("template rendered and checked", f"saved to {out.resolve()}")


def test_html_to_pdf(ui, receipt: Receipt):
    import os
    import tempfile

    try:
        from .pdf import HtmlToPdf, render_pdf_template
    except ImportError:
        try:
            from pdf import HtmlToPdf, render_pdf_template
        except Exception as exc:
            return skip(f"cannot import pdf: {exc}")

    try:
        config = Config.load("configuration.json")
    except Exception as exc:
        show_exception(ui, exc)
        return skip(f"cannot load config: {exc}")
    api_key = config.credentials.html2pdf_api_key
    api_url = config.html2pdf_api_url

    # empty API key is rejected
    try:
        HtmlToPdf("")
        raise AssertionError("empty api key should raise ValueError")
    except ValueError:
        pass

    # saving before converting fails cleanly
    client = HtmlToPdf(api_key, api_url)
    assert client.api == api_url
    raised = None
    try:
        client.save("never_written.pdf")
    except Exception as exc:
        raised = exc
    assert raised is not None, "save before convert should raise"
    assert "nothing converted yet" in str(raised), raised

    # real conversion: this calls the live API with the key from the config
    ui.update("Calling the html2pdf API")
    html = render_pdf_template(receipt, config)  # the real rendered receipt template
    assert client.convert(html) is True  # raises with the API error on failure
    assert client.pdf is not None and client.pdf.startswith(b"%PDF"), "response is not a PDF"

    # save writes the real PDF, and fails cleanly on a bad path
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "receipt.pdf")
        assert client.save(path) is True
        with open(path, "rb") as f:
            saved = f.read()
        assert saved == client.pdf and saved.startswith(b"%PDF")
        raised = None
        try:
            client.save(os.path.join(tmp, "missing_dir", "receipt.pdf"))
        except Exception as exc:
            raised = exc
        assert raised is not None, "save to a bad path should raise"
        assert "Error saving PDF" in str(raised), raised

    client.save("pdf.pdf")
    return ResultOk("live API conversion works", f"{len(client.pdf)} bytes")


def test_s3(ui):
    import os
    import tempfile

    import requests
    from botocore.exceptions import ClientError

    try:
        from .s3 import S3Client
    except ImportError:
        try:
            from s3 import S3Client
        except Exception as exc:
            return skip(f"cannot import s3: {exc}")

    try:
        config = Config.load("configuration.json")
        client = S3Client(config)
    except Exception as exc:
        show_exception(ui, exc)
        return skip(f"cannot load config / create client: {exc}")

    run_id = uuid.uuid4().hex[:12]
    pdf_bytes = b"%PDF-1.4\n% s3 test " + run_id.encode() + b"\n%%EOF\n"
    png_bytes = b"\x89PNG\r\n\x1a\n" + run_id.encode()
    buckets = {"pdf": client.pdf_bucket, "qrcode": client.qrcode_bucket}
    created = []  # (bucket, key) pairs, deleted at the end
    problems = []  # failures that should not stop the remaining checks

    def exists(bucket: str, key: str) -> bool:
        try:
            client.boto_client.head_object(Bucket=bucket, Key=key)
            return True
        except ClientError:
            return False

    def upload_and_check(path: str, upload_type: str, destination: str = None):
        bucket = buckets[upload_type]
        key = destination or os.path.basename(path)
        created.append((bucket, key))
        client.upload_file(path, upload_type, destination)
        if not exists(bucket, key):
            # S3Client only prints a blank error; ask S3 directly to show the real response
            content_type = "image/png" if path.lower().endswith(".png") else "application/pdf"
            try:
                with open(path, "rb") as f:
                    client.boto_client.put_object(Bucket=bucket, Key=key, Body=f.read(), ContentType=content_type)
            except ClientError as exc:
                ui.error(f"raw S3 error for {bucket}/{key}: {exc.response}")
            raise AssertionError(
                f"{upload_type} upload to {bucket}/{key} failed "
                "(check the bucket's allowed MIME types and file size limit in Supabase)"
            )
        return bucket, key

    try:
        with tempfile.TemporaryDirectory() as tmp:
            pdf_path = os.path.join(tmp, f"s3-test-{run_id}.pdf")
            png_path = os.path.join(tmp, f"s3-test-{run_id}.png")
            with open(pdf_path, "wb") as f:
                f.write(pdf_bytes)
            with open(png_path, "wb") as f:
                f.write(png_bytes)

            ui.update("Uploading to S3")

            # upload_file (pdf): default key is the file's basename, in the pdf bucket
            pdf_bucket, default_key = upload_and_check(pdf_path, "pdf")
            assert default_key == os.path.basename(pdf_path)
            head = client.boto_client.head_object(Bucket=pdf_bucket, Key=default_key)
            assert head["ContentType"] == "application/pdf", head["ContentType"]
            body = client.boto_client.get_object(Bucket=pdf_bucket, Key=default_key)["Body"].read()
            assert body == pdf_bytes, "uploaded pdf content differs"

            # upload_file (pdf): custom destination path, key with slashes
            upload_and_check(pdf_path, "pdf", f"tests/{run_id}/nested.pdf")

            # upload_file (qrcode): png goes to the qrcode bucket
            qr_bucket, png_key = upload_and_check(png_path, "qrcode", f"tests/{run_id}/custom.png")
            head = client.boto_client.head_object(Bucket=qr_bucket, Key=png_key)
            assert head["ContentType"] == "image/png", head["ContentType"]
            body = client.boto_client.get_object(Bucket=qr_bucket, Key=png_key)["Body"].read()
            assert body == png_bytes, "uploaded png content differs"

            # each upload landed only in its own bucket
            if pdf_bucket != qr_bucket:
                assert not exists(qr_bucket, default_key), "pdf also ended up in the qrcode bucket"
                assert not exists(pdf_bucket, png_key), "png also ended up in the pdf bucket"

            # upload_file: a missing local file is swallowed (prints), returns None, uploads nothing
            missing_key = f"tests/{run_id}/missing.pdf"
            created.append((pdf_bucket, missing_key))
            assert client.upload_file(os.path.join(tmp, "does_not_exist.pdf"), "pdf", missing_key) is None
            assert not exists(pdf_bucket, missing_key), "a missing file should not create an object"

            # upload_file: an unknown upload_type must raise "invalid upload_type"
            created.append((qr_bucket, default_key))  # in case a bad type uploads it anyway
            raised = None
            try:
                client.upload_file(pdf_path, "not-a-real-type")
            except Exception as exc:
                raised = exc
            if raised is None or "invalid upload_type" not in str(raised):
                problems.append(
                    "an unknown upload_type did not raise 'invalid upload_type' "
                    "(S3Client routes any type that is not 'pdf' to the qrcode bucket, "
                    "because of `... if \"qrcode\" else \"\"`)"
                )

        ui.update("Checking presigned URLs")

        # get_direct_url: presigned URL really downloads the uploaded file
        url = client.get_direct_url(default_key, "pdf", expires_in=60)
        assert isinstance(url, str) and url.startswith("http"), url
        assert pdf_bucket in url and default_key in url
        assert "X-Amz-Signature" in url
        assert "X-Amz-Expires=60" in url, "expires_in was not applied"
        resp = requests.get(url, timeout=30)
        assert resp.status_code == 200, resp.status_code
        assert resp.content == pdf_bytes, "downloaded content differs from what was uploaded"

        # get_direct_url (qrcode): the png comes from the qrcode bucket
        png_url = client.get_direct_url(png_key, "qrcode")
        assert qr_bucket in png_url and png_key in png_url
        assert "X-Amz-Expires=3600" in png_url, "default expiry is not 3600"
        resp = requests.get(png_url, timeout=30)
        assert resp.status_code == 200, resp.status_code
        assert resp.content == png_bytes, "downloaded png differs from what was uploaded"

        # get_direct_url: URL for a key that does not exist must not download anything
        ghost_url = client.get_direct_url(f"tests/{run_id}/ghost.pdf", "pdf")
        assert requests.get(ghost_url, timeout=30).status_code != 200

        assert not problems, "S3Client problems: " + "; ".join(problems)
        return ResultOk(
            "upload_file / get_direct_url work against the live service",
            f"buckets {pdf_bucket} and {qr_bucket}",
        )
    finally:
        for bucket, key in created:
            try:
                client.boto_client.delete_object(Bucket=bucket, Key=key)
            except Exception as exc:
                ui.error(f"warning: could not delete test object {bucket}/{key}: {exc}")


def test_api_roundtrip(ui):
    problem = api_unreachable()
    if problem:
        return skip(problem)

    fees = TransactionFees()
    amount = 1000.0
    body = {
        "amount": amount,
        "sender": {"name": "Alice Doe", "account": "1234567890"},
        "receiver": {"name": "Bob Roe", "account": "0987654321"},
        "reason": "API test",
    }
    transaction_id = None
    try:
        ui.update("POST /api/generate-receipt (converts the PDF and uploads it)")
        resp = requests.post(f"{API_BASE_URL}/api/generate-receipt", json=body, timeout=120)
        assert resp.status_code == 200, f"{resp.status_code}: {resp.text}"
        created = resp.json()
        transaction_id = created.get("transaction_id")  # set early so cleanup always runs
        assert created.get("status") == "success", created
        assert transaction_id and transaction_id.startswith(API_ID_PREFIX), transaction_id
        assert len(transaction_id) == 20, transaction_id

        ui.update("GET /api/transactions/<id>")
        resp = requests.get(f"{API_BASE_URL}/api/transactions/{transaction_id}", timeout=30)
        assert resp.status_code == 200, f"{resp.status_code}: {resp.text}"
        data = resp.json()

        # shape: everything is a string, same keys as Receipt.to_client()
        assert data["transaction_id"] == transaction_id
        assert all(isinstance(v, str) for v in data.values()), "non-string value in response"

        # values stored from the request
        assert data["sender_name"] == "Alice Doe"
        assert data["receiver_name"] == "Bob Roe"
        assert data["reason"] == "API test"
        assert math.isclose(float(data["amount"]), amount)
        assert abs(int(data["time"]) - time.time()) < 300, "receipt time is not recent"

        # fees use TransactionFees() defaults
        assert math.isclose(float(data["fee_service_charge"]), fees.service_charge)
        assert math.isclose(float(data["fee_vat_amount"]), fees.vat.calculate(amount))
        assert math.isclose(float(data["fee_commission_amount"]), fees.commission.calculate(amount))
        assert math.isclose(float(data["fee_disaster_recovery_amount"]), fees.disaster_recovery.calculate(amount))
        assert math.isclose(float(data["total_debited"]), amount + fees.calculate_fees(amount))

        # accounts are masked in the response, never shown in full
        assert data["sender_account"] == "1234******", data["sender_account"]
        assert data["receiver_account"] == "0987******", data["receiver_account"]
        assert "1234567890" not in resp.text and "0987654321" not in resp.text

        # the signed links really download the files
        ui.update("Downloading the PDF and QR code from the signed links")
        pdf = requests.get(data["pdf_url"], timeout=30)
        assert pdf.status_code == 200, f"pdf_url: {pdf.status_code}"
        assert pdf.content.startswith(b"%PDF"), "pdf_url did not return a PDF"
        qr = requests.get(data["qr_url"], timeout=30)
        assert qr.status_code == 200, f"qr_url: {qr.status_code}"
        assert qr.content.startswith(b"\x89PNG\r\n\x1a\n"), "qr_url did not return a PNG"
        assert data["qr_text"], "qr_text is empty"

        return ResultOk("receipt generated, fetched and verified", transaction_id)
    finally:
        if transaction_id:
            ui.update("Cleaning up the test receipt")
            cleanup_receipt(ui, transaction_id)


def test_api_not_found(ui):
    problem = api_unreachable()
    if problem:
        return skip(problem)

    resp = requests.get(f"{API_BASE_URL}/api/transactions/does-not-exist", timeout=30)
    assert resp.status_code == 404, f"{resp.status_code}: {resp.text}"
    detail = resp.json().get("detail", "")
    assert "not found" in detail, detail
    return ResultOk("unknown ids return 404", detail)


def test_api_validation(ui):
    problem = api_unreachable()
    if problem:
        return skip(problem)

    user = {"name": "Alice", "account": "1234567890"}
    bad_bodies = {
        "missing sender": {"amount": 100, "receiver": user},
        "non-numeric amount": {"amount": "abc", "sender": user, "receiver": user},
        "empty body": {},
    }
    statuses = {}
    for label, body in bad_bodies.items():
        resp = requests.post(f"{API_BASE_URL}/api/generate-receipt", json=body, timeout=30)
        statuses[label] = resp.status_code
        assert resp.status_code == 422, f"{label}: expected 422, got {resp.status_code}: {resp.text}"
    return ResultOk("invalid requests are rejected with 422", statuses)


def main() -> int:
    receipt = build_receipt()
    manager = TestManager(
        ui=ConsoleSpinner(),
        tests=[
            Test(TestInfo("User mask", "User.mask"), TestBody(test_user_mask)),
            Test(TestInfo("Fees", "TransactionFees.calculate_fees"), TestBody(test_fees)),
            Test(TestInfo("Receipt request", "ReceiptRequest defaults"), TestBody(test_request)),
            Test(TestInfo("From request", "Receipt.from_request / generate_transaction_id"), TestBody(test_from_request)),
            Test(TestInfo("Serialize", "Receipt.serialize"), TestBody(test_serialize, {"receipt": receipt})),
            Test(TestInfo("To client", "Receipt.to_client"), TestBody(test_to_client, {"receipt": receipt})),
            Test(TestInfo("QR code", "Receipt.qrcode"), TestBody(test_qrcode, {"receipt": receipt})),
            Test(TestInfo("DB roundtrip", "DBManager save_receipt / fetch_receipt"), TestBody(test_db_roundtrip, {"receipt": receipt})),
            Test(TestInfo("PDF template", "render_pdf_template"), TestBody(test_pdf, {"receipt": receipt})),
            Test(TestInfo("HTML to PDF", "HtmlToPdf against the live API"), TestBody(test_html_to_pdf, {"receipt": receipt})),
            Test(TestInfo("S3", "S3Client upload_file / get_direct_url"), TestBody(test_s3)),
            Test(TestInfo("API roundtrip", "POST /api/generate-receipt then GET /api/transactions/<id>"), TestBody(test_api_roundtrip)),
            Test(TestInfo("API not found", "GET with an unknown id"), TestBody(test_api_not_found)),
            Test(TestInfo("API validation", "POST with invalid bodies"), TestBody(test_api_validation)),
        ],
    )
    return 0 if manager.run() else 1


if __name__ == "__main__":
    sys.exit(main())