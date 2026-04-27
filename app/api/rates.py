from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import ExchangeRate, User
from app.schemas.schemas import ExchangeRateResponse, SeedRateRequest
from app.services.rate_service import get_or_refresh_latest_rate

router = APIRouter()


@router.get("/latest", response_model=ExchangeRateResponse)
def get_latest_rate(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = get_or_refresh_latest_rate(db)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No exchange rates found",
        )
    return row


@router.post("/seed", response_model=ExchangeRateResponse, status_code=status.HTTP_201_CREATED)
def seed_rate(
    body: SeedRateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = ExchangeRate(rate=body.rate, source="manual_seed")
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
