import uuid
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import (
    Currency, Transaction, TransactionSource, TransactionStatus, User,
)
from app.schemas.schemas import OCRScanResponse
from app.services import ocr_service
from app.services.receipt_parser import parse_receipt_to_json

router = APIRouter()

UPLOAD_DIR = Path("uploads/receipts")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {"image/jpeg", "image/png"}


@router.post("/scan-receipt", response_model=OCRScanResponse)
async def scan_receipt(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG and PNG images are accepted",
        )

    # Save file
    ext = "jpg" if file.content_type == "image/jpeg" else "png"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / filename
    filepath.write_bytes(await file.read())

    # OCR inference
    raw_text = await ocr_service.extract_text_from_image(str(filepath))

    # Parse receipt text into structured data
    parsed = parse_receipt_to_json(raw_text)

    # Create pending transaction (no balance deduction)
    amount = parsed["amount"] or Decimal("0")
    currency = Currency.USD if parsed["currency"] == "USD" else Currency.LBP
    txn_date = parsed["date"] or datetime.utcnow()
    description = (
        f"{parsed['merchant']} — (OCR: {raw_text[:200]})"
        if raw_text
        else parsed["merchant"]
    )

    txn = Transaction(
        user_id=user.id,
        institution_id=None,
        category_id=None,
        amount=amount,
        currency=currency,
        usd_equivalent=Decimal("0"),
        description=description,
        transaction_date=txn_date,
        status=TransactionStatus.pending,
        source=TransactionSource.ocr,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    return OCRScanResponse(
        id=txn.id,
        merchant=parsed["merchant"],
        amount=parsed["amount"],
        currency=parsed["currency"],
        transaction_date=txn.transaction_date,
        description=txn.description,
        raw_text=raw_text,
    )
