from datetime import date, datetime, time, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import (
    Currency, Institution, Transaction, TransactionSource, TransactionStatus, User,
)
from app.schemas.schemas import (
    ClaimPendingRequest, PaginatedTransactionResponse, SimulateVisaSpendRequest,
    SmsTransactionCreateRequest,
    TransactionConfirmedResponse, TransactionCreate, TransactionListResponse,
    TransactionUpdate,
)
from app.services.sms_parser import parse_sms_transaction
from app.services.transaction_service import TransactionService

router = APIRouter()


def _load_txn_relations(q):
    return q.options(
        joinedload(Transaction.category),
        joinedload(Transaction.tags),
    )


# ── Manual entry ─────────────────────────────────────────────────────────────

@router.post("/", response_model=TransactionConfirmedResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    body: TransactionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txn = TransactionService.create_transaction(
        db,
        user.id,
        institution_id=body.institution_id,
        category_id=body.category_id,
        amount=body.amount,
        currency=body.currency,
        description=body.description,
        transaction_date=body.transaction_date,
        tag_ids=body.tag_ids,
    )
    # Reload with relations for response
    return db.query(Transaction).options(
        joinedload(Transaction.category),
        joinedload(Transaction.tags),
    ).get(txn.id)


# ── List ─────────────────────────────────────────────────────────────────────

@router.get("/", response_model=PaginatedTransactionResponse)
def list_transactions(
    institution_id: int | None = Query(None),
    category_id: int | None = Query(None),
    txn_status: TransactionStatus | None = Query(None, alias="status"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base = (
        db.query(Transaction)
        .filter(Transaction.user_id == user.id)
    )
    if institution_id is not None:
        base = base.filter(Transaction.institution_id == institution_id)
    if category_id is not None:
        base = base.filter(Transaction.category_id == category_id)
    if txn_status is not None:
        base = base.filter(Transaction.status == txn_status)
    if start_date:
        base = base.filter(
            Transaction.transaction_date >= datetime.combine(start_date, time.min)
        )
    if end_date:
        base = base.filter(
            Transaction.transaction_date < datetime.combine(end_date + timedelta(days=1), time.min)
        )

    total = base.with_entities(func.count(Transaction.id)).scalar()

    items = (
        base.options(joinedload(Transaction.category), joinedload(Transaction.tags))
        .order_by(Transaction.transaction_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return PaginatedTransactionResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size if total else 0,
    )


# ── Claim pending (Visa auto-pay) ───────────────────────────────────────────

@router.post("/claim-pending/{transaction_id}", response_model=TransactionConfirmedResponse)
def claim_pending(
    transaction_id: int,
    body: ClaimPendingRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txn = TransactionService.claim_pending(
        db,
        user.id,
        transaction_id,
        body.institution_id,
        body.amount,
        body.currency,
        body.description,
        body.transaction_date,
        body.category_id,
        body.tag_ids,
    )
    return db.query(Transaction).options(
        joinedload(Transaction.category),
        joinedload(Transaction.tags),
    ).get(txn.id)


# ── Simulate Visa spend ──────────────────────────────────────────────────────

@router.put("/{transaction_id}", response_model=TransactionConfirmedResponse)
def update_transaction(
    transaction_id: int,
    body: TransactionUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txn = TransactionService.update_confirmed_transaction(
        db,
        user.id,
        transaction_id,
        description_set="description" in body.model_fields_set,
        description=body.description,
        category_id_set="category_id" in body.model_fields_set,
        category_id=body.category_id,
        tag_ids_set="tag_ids" in body.model_fields_set,
        tag_ids=body.tag_ids,
    )
    return db.query(Transaction).options(
        joinedload(Transaction.category),
        joinedload(Transaction.tags),
    ).get(txn.id)


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    TransactionService.delete_transaction(db, user.id, transaction_id)
    return {"message": "Transaction deleted successfully"}


@router.post("/simulate-visa-spend", response_model=TransactionConfirmedResponse)
def simulate_visa_spend(
    body: SimulateVisaSpendRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    institution = (
        db.query(Institution)
        .filter(
            Institution.id == body.institution_id,
            Institution.user_id == user.id,
        )
        .first()
    )
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found",
        )

    txn = TransactionService.create_transaction(
        db,
        user.id,
        institution_id=body.institution_id,
        category_id=None,
        amount=body.amount,
        currency=Currency.USD,
        description="Visa auto-spend (simulated)",
        transaction_date=datetime.utcnow(),
        tag_ids=None,
        source=TransactionSource.auto_card,
        status_=TransactionStatus.pending,
        usd_equivalent_override=body.amount,
    )
    return db.query(Transaction).options(
        joinedload(Transaction.category),
        joinedload(Transaction.tags),
    ).get(txn.id)


@router.post("/from-sms", response_model=TransactionConfirmedResponse, status_code=status.HTTP_201_CREATED)
def create_transaction_from_sms(
    body: SmsTransactionCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    parsed = parse_sms_transaction(body.raw_text)

    institution_id = body.institution_id
    matched_wallet = None
    if institution_id is not None:
        matched_wallet = (
            db.query(Institution)
            .filter(
                Institution.id == institution_id,
                Institution.user_id == user.id,
                Institution.is_active.is_(True),
            )
            .first()
        )
    elif parsed.last_four_digits:
        matched_wallet = (
            db.query(Institution)
            .filter(
                Institution.user_id == user.id,
                Institution.last_four_digits == parsed.last_four_digits,
                Institution.is_active.is_(True),
            )
            .first()
        )
        institution_id = matched_wallet.id if matched_wallet else None

    currency = Currency.USD
    if parsed.currency in {Currency.USD.value, Currency.LBP.value}:
        currency = Currency(parsed.currency)
    elif matched_wallet and matched_wallet.card_type == "Cash_LBP":
        currency = Currency.LBP
    elif matched_wallet and matched_wallet.card_type == "Cash_USD":
        currency = Currency.USD

    txn = TransactionService.create_pending_sms_transaction(
        db,
        user.id,
        institution_id=institution_id,
        amount=parsed.amount or Decimal("0.00"),
        currency=currency,
        description=parsed.description or body.raw_text.strip()[:160],
        transaction_date=parsed.transaction_date or datetime.utcnow(),
    )
    return db.query(Transaction).options(
        joinedload(Transaction.category),
        joinedload(Transaction.tags),
    ).get(txn.id)
