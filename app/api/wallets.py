from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import Institution, RecurringTransactionSchedule, User
from app.schemas.schemas import InstitutionCreate, InstitutionUpdate, WalletResponse

router = APIRouter()

_LBP_TYPES = {"Cash_LBP"}


def _format_balance(balance: Decimal, card_type: str) -> str:
    if card_type in _LBP_TYPES:
        return f"{balance:,.0f} LBP"
    return f"${balance:,.2f}"


def _wallet_response(wallet: Institution) -> WalletResponse:
    balance = Decimal(str(wallet.current_balance))
    return WalletResponse(
        id=wallet.id,
        user_id=wallet.user_id,
        name=wallet.name,
        card_type=wallet.card_type,
        last_four_digits=wallet.last_four_digits,
        current_balance=balance,
        is_active=wallet.is_active,
        formatted_balance=_format_balance(balance, wallet.card_type),
        created_at=wallet.created_at,
    )


@router.get("/", response_model=list[WalletResponse])
def list_wallets(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Institution)
        .filter(Institution.user_id == user.id, Institution.is_active.is_(True))
        .all()
    )
    return [_wallet_response(w) for w in rows]


@router.get("/{wallet_id}", response_model=WalletResponse)
def get_wallet(
    wallet_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wallet = (
        db.query(Institution)
        .filter(
            Institution.id == wallet_id,
            Institution.user_id == user.id,
            Institution.is_active.is_(True),
        )
        .first()
    )
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found",
        )

    return _wallet_response(wallet)


@router.post("/", response_model=WalletResponse, status_code=status.HTTP_201_CREATED)
def create_wallet(
    body: InstitutionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wallet = Institution(
        user_id=user.id,
        name=body.name,
        card_type=body.card_type,
        last_four_digits=body.last_four_digits,
        current_balance=body.current_balance,
    )
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return _wallet_response(wallet)


@router.put("/{wallet_id}", response_model=WalletResponse)
def update_wallet(
    wallet_id: int,
    body: InstitutionUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wallet = (
        db.query(Institution)
        .filter(
            Institution.id == wallet_id,
            Institution.user_id == user.id,
            Institution.is_active.is_(True),
        )
        .first()
    )
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found",
        )

    if "name" in body.model_fields_set and body.name is not None:
        wallet.name = body.name
    if "current_balance" in body.model_fields_set and body.current_balance is not None:
        wallet.current_balance = body.current_balance

    db.commit()
    db.refresh(wallet)
    return _wallet_response(wallet)


@router.delete("/{wallet_id}")
def delete_wallet(
    wallet_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wallet = (
        db.query(Institution)
        .filter(
            Institution.id == wallet_id,
            Institution.user_id == user.id,
            Institution.is_active.is_(True),
        )
        .first()
    )
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found",
        )

    wallet.is_active = False
    (
        db.query(RecurringTransactionSchedule)
        .filter(
            RecurringTransactionSchedule.user_id == user.id,
            RecurringTransactionSchedule.institution_id == wallet.id,
            RecurringTransactionSchedule.is_active.is_(True),
        )
        .update({"is_active": False}, synchronize_session=False)
    )
    db.commit()
    return {"message": "Wallet deleted successfully"}
