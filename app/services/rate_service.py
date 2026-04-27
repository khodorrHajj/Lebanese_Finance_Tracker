import logging
from datetime import date, datetime
from decimal import Decimal

import httpx
import yfinance as yf
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import (
    EXCHANGE_RATE_API_URL,
    RATE_FETCH_TIMEOUT_SECONDS,
    UNOFFICIAL_LBP_RATE_API_URL,
)
from app.models.models import ExchangeRate

logger = logging.getLogger("liratrack.rate_service")

YFINANCE_TICKER = "USDLBP=X"


def _decimal_from_value(value: object) -> Decimal:
    return Decimal(str(value).replace(",", "").strip())


def _fetch_open_exchange_rate() -> tuple[Decimal, str]:
    response = httpx.get(EXCHANGE_RATE_API_URL, timeout=RATE_FETCH_TIMEOUT_SECONDS)
    response.raise_for_status()

    payload = response.json()
    if payload.get("result") != "success":
        raise ValueError("Open exchange rate API returned an unsuccessful result")

    rates = payload.get("rates") or {}
    raw_rate = rates.get("LBP")
    if raw_rate is None:
        raise ValueError("LBP was missing from open exchange rate response")

    rate = _decimal_from_value(raw_rate).quantize(Decimal("0.0001"))
    return rate, "exchange_rate_api_open"


def _fetch_unofficial_market_rate() -> tuple[Decimal, str]:
    if not UNOFFICIAL_LBP_RATE_API_URL:
        raise ValueError("UNOFFICIAL_LBP_RATE_API_URL is not configured")

    response = httpx.get(
        UNOFFICIAL_LBP_RATE_API_URL,
        timeout=RATE_FETCH_TIMEOUT_SECONDS,
    )
    response.raise_for_status()

    payload = response.json()
    buy_rate = payload.get("buy_rate")
    sell_rate = payload.get("sell_rate")
    direct_rate = payload.get("rate")

    if buy_rate is not None and sell_rate is not None:
        rate = (_decimal_from_value(buy_rate) + _decimal_from_value(sell_rate)) / Decimal("2")
    elif direct_rate is not None:
        rate = _decimal_from_value(direct_rate)
    else:
        raise ValueError("Unofficial rate response did not include a usable rate")

    return rate.quantize(Decimal("0.0001")), "unofficial_market_api"


def _fetch_yfinance_rate() -> tuple[Decimal, str]:
    ticker = yf.Ticker(YFINANCE_TICKER)
    hist = ticker.history(period="1d")
    if hist.empty:
        raise ValueError(f"yfinance returned empty data for {YFINANCE_TICKER}")

    raw_rate = hist["Close"].iloc[-1]
    rate = _decimal_from_value(raw_rate).quantize(Decimal("0.0001"))
    return rate, "yfinance"


def _fetch_latest_rate() -> tuple[Decimal, str]:
    providers = [
        ("open exchange rate API", _fetch_open_exchange_rate),
    ]

    if UNOFFICIAL_LBP_RATE_API_URL:
        providers.insert(0, ("unofficial market API", _fetch_unofficial_market_rate))

    providers.append(("yfinance", _fetch_yfinance_rate))

    last_error: Exception | None = None

    for provider_name, fetcher in providers:
        try:
            rate, source = fetcher()
            logger.info("Fetched USD/LBP rate from %s: %s", provider_name, rate)
            return rate, source
        except Exception as exc:
            last_error = exc
            logger.warning("Rate provider failed: %s", provider_name, exc_info=True)

    raise RuntimeError("All exchange-rate providers failed") from last_error


def _store_latest_rate(db: Session, rate: Decimal, source: str) -> None:
    today = date.today()

    existing = (
        db.execute(
            select(ExchangeRate)
            .where(ExchangeRate.source == source)
            .filter(
                ExchangeRate.recorded_at
                >= datetime.combine(today, datetime.min.time()),
            )
            .order_by(ExchangeRate.recorded_at.desc())
            .limit(1)
        )
        .scalar_one_or_none()
    )

    if existing:
        existing.rate = rate
        existing.recorded_at = datetime.now()
    else:
        db.add(ExchangeRate(rate=rate, source=source))

    db.commit()
    logger.info("Rate updated: 1 USD = %s LBP via %s", rate, source)


def fetch_and_store_latest_rate(db: Session) -> ExchangeRate | None:
    try:
        rate, source = _fetch_latest_rate()
    except Exception:
        logger.exception("Failed to fetch rate from all configured providers")
        return None

    _store_latest_rate(db, rate, source)
    return get_latest_saved_rate(db)


def get_latest_saved_rate(db: Session) -> ExchangeRate | None:
    return (
        db.execute(
            select(ExchangeRate)
            .order_by(ExchangeRate.recorded_at.desc())
            .limit(1)
        )
        .scalar_one_or_none()
    )


def get_or_refresh_latest_rate(
    db: Session,
    max_age_minutes: int = 180,
) -> ExchangeRate | None:
    latest_rate = get_latest_saved_rate(db)
    if latest_rate is None:
        return fetch_and_store_latest_rate(db)

    age = datetime.utcnow() - latest_rate.recorded_at
    if age.total_seconds() > max_age_minutes * 60:
        refreshed = fetch_and_store_latest_rate(db)
        if refreshed is not None:
            return refreshed

    return latest_rate
