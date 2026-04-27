from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import Category, Institution, RecurringTransactionSchedule, User
from app.schemas.schemas import (
    RecurringScheduleCreateRequest,
    RecurringScheduleResponse,
)
from app.services.recurring_service import ensure_schedule_transactions

router = APIRouter()


def _schedule_response(schedule: RecurringTransactionSchedule) -> RecurringScheduleResponse:
    monthly_days = []
    if schedule.monthly_days:
        monthly_days = [
            int(chunk)
            for chunk in schedule.monthly_days.split(",")
            if chunk.strip()
        ]

    return RecurringScheduleResponse(
        id=schedule.id,
        user_id=schedule.user_id,
        institution_id=schedule.institution_id,
        category_id=schedule.category_id,
        amount=schedule.amount,
        currency=schedule.currency,
        description=schedule.description,
        start_date=schedule.start_date,
        monthly_days=monthly_days,
        include_last_day=schedule.include_last_day,
        is_active=schedule.is_active,
        created_at=schedule.created_at,
    )


@router.post("/", response_model=RecurringScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_recurring_schedule(
    body: RecurringScheduleCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not body.monthly_days and not body.include_last_day:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one monthly day or last-day option is required",
        )

    wallet = (
        db.query(Institution)
        .filter(
            Institution.id == body.institution_id,
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

    category = (
        db.query(Category)
        .filter(Category.id == body.category_id, Category.user_id == user.id)
        .first()
    )
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    monthly_days = sorted({day for day in body.monthly_days if 1 <= day <= 31})
    schedule = RecurringTransactionSchedule(
        user_id=user.id,
        institution_id=body.institution_id,
        category_id=body.category_id,
        amount=body.amount,
        currency=body.currency,
        description=body.description.strip() if body.description else None,
        start_date=body.start_date,
        monthly_days=",".join(str(day) for day in monthly_days) or None,
        include_last_day=body.include_last_day,
        is_active=True,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    ensure_schedule_transactions(db, schedule, now=datetime.utcnow())

    return _schedule_response(schedule)
