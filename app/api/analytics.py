from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User
from app.schemas.schemas import (
    ForecastResponse, NetWorthResponse, RateHistoryItem,
    SpendingBreakdownItem,
)
from app.services.analytics_service import (
    calculate_monthly_forecast, calculate_net_worth,
    get_rate_history, get_spending_breakdown,
)

router = APIRouter()


@router.get("/net-worth", response_model=NetWorthResponse)
def net_worth(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return calculate_net_worth(db, user.id)


@router.get("/forecast", response_model=ForecastResponse)
def forecast(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return calculate_monthly_forecast(db, user.id)


@router.get("/spending-breakdown", response_model=list[SpendingBreakdownItem])
def spending_breakdown(
    month: int = Query(default=datetime.utcnow().month, ge=1, le=12),
    year: int = Query(default=datetime.utcnow().year, ge=2020),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_spending_breakdown(db, user.id, month, year)


@router.get("/rates/history", response_model=list[RateHistoryItem])
def rate_history(
    days: int = Query(default=30, ge=1, le=365),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_rate_history(db, days)
