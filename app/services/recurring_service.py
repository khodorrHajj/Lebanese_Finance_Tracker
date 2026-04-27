import calendar
import logging
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.models import (
    Category,
    CategoryType,
    Currency,
    LifecycleType,
    RecurringTransactionSchedule,
    Transaction,
    TransactionSource,
    TransactionStatus,
)
from app.schemas.schemas import TransactionCreate
from app.services.transaction_service import TransactionService

logger = logging.getLogger("liratrack")


def _get_month_bounds(now: datetime) -> tuple[datetime, datetime]:
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if month_start.month == 12:
        next_month_start = month_start.replace(
            year=month_start.year + 1,
            month=1,
        )
    else:
        next_month_start = month_start.replace(month=month_start.month + 1)
    return month_start, next_month_start


def _month_windows(now: datetime) -> list[tuple[int, int]]:
    windows = [(now.year, now.month)]
    if now.month == 12:
        windows.append((now.year + 1, 1))
    else:
        windows.append((now.year, now.month + 1))
    return windows


def _schedule_windows(
    schedule: RecurringTransactionSchedule,
    *,
    now: datetime,
) -> list[tuple[int, int]]:
    windows = set(_month_windows(now))

    start_month = (schedule.start_date.year, schedule.start_date.month)
    latest_window = max(windows)
    if start_month > latest_window:
        windows.add(start_month)

    return sorted(windows)


def _parse_monthly_days(raw_days: str | None) -> set[int]:
    if not raw_days:
        return set()

    values: set[int] = set()
    for chunk in raw_days.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        try:
            day_value = int(chunk)
        except ValueError:
            continue
        if 1 <= day_value <= 31:
            values.add(day_value)
    return values


def _serialize_monthly_days(days: list[int]) -> str:
    normalized = sorted({day for day in days if 1 <= day <= 31})
    return ",".join(str(day) for day in normalized)


def _build_occurrence_dates(
    schedule: RecurringTransactionSchedule,
    *,
    year: int,
    month: int,
) -> list[date]:
    days = _parse_monthly_days(schedule.monthly_days)
    last_day = calendar.monthrange(year, month)[1]
    occurrence_days = {day for day in days if day <= last_day}

    if schedule.include_last_day:
        occurrence_days.add(last_day)

    return [
        date(year, month, day)
        for day in sorted(occurrence_days)
        if date(year, month, day) >= schedule.start_date
    ]


def ensure_schedule_transactions(
    db: Session,
    schedule: RecurringTransactionSchedule,
    *,
    now: datetime | None = None,
) -> int:
    now = now or datetime.utcnow()
    created_count = 0

    for year, month in _schedule_windows(schedule, now=now):
        for occurrence_date in _build_occurrence_dates(schedule, year=year, month=month):
            transaction_date = datetime.combine(occurrence_date, time.min)

            existing_transaction_id = (
                db.execute(
                    select(Transaction.id)
                    .where(
                        Transaction.recurring_schedule_id == schedule.id,
                        Transaction.transaction_date == transaction_date,
                    )
                    .limit(1)
                )
                .scalar_one_or_none()
            )
            if existing_transaction_id is not None:
                continue

            try:
                TransactionService.create_pending_recurring_transaction(
                    db,
                    schedule.user_id,
                    recurring_schedule_id=schedule.id,
                    institution_id=schedule.institution_id,
                    category_id=schedule.category_id,
                    amount=Decimal(str(schedule.amount)),
                    currency=schedule.currency,
                    description=schedule.description,
                    transaction_date=transaction_date,
                )
                created_count += 1
            except Exception:
                db.rollback()
                logger.exception(
                    "Recurring pending transaction generation failed for schedule_id=%s",
                    schedule.id,
                )

    return created_count


def activate_due_recurring_transactions(db: Session, *, now: datetime | None = None) -> int:
    now = now or datetime.utcnow()
    due_transactions = (
        db.execute(
            select(Transaction).where(
                Transaction.source == TransactionSource.recurring,
                Transaction.status == TransactionStatus.pending,
                Transaction.transaction_date <= now,
            )
        )
        .scalars()
        .all()
    )

    activated_count = 0

    for transaction in due_transactions:
        try:
            TransactionService.activate_recurring_pending_transaction(db, transaction.id)
            activated_count += 1
        except Exception:
            db.rollback()
            logger.exception(
                "Recurring transaction activation failed for transaction_id=%s",
                transaction.id,
            )

    return activated_count


def _process_legacy_category_monthlies(db: Session, now: datetime) -> int:
    month_start, next_month_start = _get_month_bounds(now)

    categories = (
        db.execute(
            select(Category).where(
                Category.lifecycle_type == LifecycleType.monthly,
                Category.type.in_((CategoryType.income, CategoryType.expense)),
                Category.fixed_monthly_amount.is_not(None),
            )
        )
        .scalars()
        .all()
    )

    created_count = 0

    for category in categories:
        existing_transaction_id = (
            db.execute(
                select(Transaction.id)
                .where(
                    Transaction.user_id == category.user_id,
                    Transaction.category_id == category.id,
                    Transaction.transaction_date >= month_start,
                    Transaction.transaction_date < next_month_start,
                    Transaction.source == TransactionSource.manual,
                )
                .limit(1)
            )
            .scalar_one_or_none()
        )
        if existing_transaction_id is not None:
            continue

        payload = TransactionCreate(
            institution_id=None,
            category_id=category.id,
            amount=category.fixed_monthly_amount,
            currency=Currency.USD,
            description=None,
            transaction_date=month_start,
            tag_ids=None,
        )

        try:
            TransactionService.create_transaction(db, category.user_id, payload)
            created_count += 1
        except Exception:
            db.rollback()
            logger.exception(
                "Legacy monthly recurring generation failed for category_id=%s user_id=%s",
                category.id,
                category.user_id,
            )

    return created_count


def process_recurring_events(db: Session) -> None:
    now = datetime.utcnow()

    schedules = (
        db.execute(
            select(RecurringTransactionSchedule).where(
                RecurringTransactionSchedule.is_active.is_(True)
            )
        )
        .scalars()
        .all()
    )

    generated_count = 0
    for schedule in schedules:
        generated_count += ensure_schedule_transactions(db, schedule, now=now)

    activated_count = activate_due_recurring_transactions(db, now=now)
    legacy_count = _process_legacy_category_monthlies(db, now)

    logger.info(
        "Recurring events processed: %s future pending generated, %s activated, %s legacy monthlies created",
        generated_count,
        activated_count,
        legacy_count,
    )
