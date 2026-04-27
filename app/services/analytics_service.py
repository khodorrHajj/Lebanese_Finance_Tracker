from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import func, select, extract
from sqlalchemy.orm import Session

from app.models.models import (
    Category, CategoryType, ExchangeRate, Institution, LifecycleType,
    Transaction, TransactionStatus,
)
from app.services.rate_service import get_or_refresh_latest_rate

_LBP_TYPES = {"Cash_LBP"}


def calculate_net_worth(db: Session, user_id: int) -> dict:
    wallets = (
        db.query(Institution)
        .filter(Institution.user_id == user_id, Institution.is_active.is_(True))
        .all()
    )

    total_lbp = Decimal("0")
    total_usd = Decimal("0")

    for w in wallets:
        balance = Decimal(str(w.current_balance))
        if w.card_type in _LBP_TYPES:
            total_lbp += balance
        else:
            total_usd += balance

    latest_rate = get_or_refresh_latest_rate(db)

    rate_value: Optional[Decimal] = None
    rate_timestamp: Optional[datetime] = None
    lbp_in_usd = Decimal("0")

    if latest_rate:
        rate_value = Decimal(str(latest_rate.rate))
        rate_timestamp = latest_rate.recorded_at
        lbp_in_usd = (total_lbp / rate_value).quantize(Decimal("0.01"))

    total_net_worth_usd = total_usd + lbp_in_usd

    return {
        "total_lbp": total_lbp,
        "total_usd": total_usd,
        "total_net_worth_usd": total_net_worth_usd,
        "latest_rate": rate_value,
        "rate_timestamp": rate_timestamp,
    }


def calculate_monthly_forecast(db: Session, user_id: int) -> dict:
    rows = (
        db.execute(
            select(
                Category.type,
                func.coalesce(func.sum(Category.fixed_monthly_amount), 0),
            )
            .where(
                Category.user_id == user_id,
                Category.lifecycle_type == LifecycleType.monthly,
            )
            .group_by(Category.type)
        )
        .all()
    )

    income = Decimal("0")
    expenses = Decimal("0")

    for cat_type, total in rows:
        val = Decimal(str(total))
        if cat_type == CategoryType.income:
            income = val
        else:
            expenses = val

    return {
        "expected_income": income,
        "expected_expenses": expenses,
        "projected_savings": income - expenses,
    }


def get_spending_breakdown(
    db: Session, user_id: int, month: int, year: int,
) -> list[dict]:
    rows = (
        db.execute(
            select(
                Transaction.category_id,
                Category.name_en,
                Category.name_ar,
                func.coalesce(func.sum(Transaction.usd_equivalent), 0).label(
                    "total_spent_usd"
                ),
            )
            .join(Category, Transaction.category_id == Category.id)
            .where(
                Transaction.user_id == user_id,
                Transaction.status == TransactionStatus.confirmed,
                Category.type == CategoryType.expense,
                extract("month", Transaction.transaction_date) == month,
                extract("year", Transaction.transaction_date) == year,
            )
            .group_by(Transaction.category_id, Category.name_en, Category.name_ar)
            .order_by(func.sum(Transaction.usd_equivalent).desc())
        )
        .all()
    )

    return [
        {
            "category_id": r[0],
            "name_en": r[1],
            "name_ar": r[2],
            "total_spent_usd": Decimal(str(r[3])).quantize(Decimal("0.01")),
        }
        for r in rows
    ]


def get_rate_history(db: Session, days: int = 30) -> list[dict]:
    from datetime import timedelta

    cutoff = datetime.utcnow() - timedelta(days=days)

    rows = (
        db.execute(
            select(
                ExchangeRate.recorded_at,
                ExchangeRate.rate,
            )
            .where(ExchangeRate.recorded_at >= cutoff)
            .order_by(ExchangeRate.recorded_at.asc())
        )
        .all()
    )

    return [
        {
            "date": r[0].strftime("%Y-%m-%d"),
            "rate": Decimal(str(r[1])),
        }
        for r in rows
    ]
