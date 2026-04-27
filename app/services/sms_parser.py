import re
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation


@dataclass
class ParsedSmsTransaction:
    amount: Decimal | None
    currency: str | None
    description: str | None
    transaction_date: datetime | None
    last_four_digits: str | None


_AMOUNT_PATTERNS = [
    re.compile(
        r"(?P<currency>USD|LBP|EUR)\s*(?P<amount>\d[\d,]*(?:\.\d{1,2})?)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?P<amount>\d[\d,]*(?:\.\d{1,2})?)\s*(?P<currency>USD|LBP|EUR)",
        re.IGNORECASE,
    ),
    re.compile(r"(?P<currency>\$)\s*(?P<amount>\d[\d,]*(?:\.\d{1,2})?)"),
]

_CARD_PATTERNS = [
    re.compile(r"(?:ending|ends? with|card|visa|mastercard)[^\d]*(\d{4})", re.IGNORECASE),
    re.compile(r"\*{2,}\s*(\d{4})"),
]

_MERCHANT_PATTERNS = [
    re.compile(r"\b(?:at|to|from)\s+([A-Za-z0-9&'.,\- ]{2,80})", re.IGNORECASE),
    re.compile(r"\bmerchant[:\s]+([A-Za-z0-9&'.,\- ]{2,80})", re.IGNORECASE),
]

_DATE_PATTERNS = [
    "%d/%m/%Y %H:%M",
    "%d/%m/%Y %I:%M %p",
    "%d-%m-%Y %H:%M",
    "%d-%m-%Y %I:%M %p",
    "%Y-%m-%d %H:%M",
]


def _normalize_amount(raw_value: str) -> Decimal | None:
    try:
        return Decimal(raw_value.replace(",", "")).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return None


def _extract_amount_and_currency(text: str) -> tuple[Decimal | None, str | None]:
    for pattern in _AMOUNT_PATTERNS:
        match = pattern.search(text)
        if not match:
            continue

        amount = _normalize_amount(match.group("amount"))
        raw_currency = match.group("currency").upper()
        currency = "USD" if raw_currency == "$" else raw_currency
        return amount, currency

    return None, None


def _extract_last_four_digits(text: str) -> str | None:
    for pattern in _CARD_PATTERNS:
        match = pattern.search(text)
        if match:
            return match.group(1)
    return None


def _extract_description(text: str) -> str | None:
    for pattern in _MERCHANT_PATTERNS:
        match = pattern.search(text)
        if not match:
            continue

        candidate = re.split(
            r"\s+(?:on|at\s+\d|dated|date|time|ref|reference|card|ending)\b",
            match.group(1).strip(),
            maxsplit=1,
            flags=re.IGNORECASE,
        )[0].strip(" .,-")
        if candidate:
            return candidate

    cleaned = " ".join(text.split())
    return cleaned[:160] if cleaned else None


def _extract_transaction_date(text: str) -> datetime | None:
    compact_text = " ".join(text.split())

    # dd/mm/yyyy 14:30 or dd/mm/yyyy 2:30 PM
    date_time_match = re.search(
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(\d{1,2}:\d{2}(?:\s*[AP]M)?)",
        compact_text,
        re.IGNORECASE,
    )
    if date_time_match:
        candidate = f"{date_time_match.group(1)} {date_time_match.group(2).upper()}"
        for fmt in _DATE_PATTERNS:
            try:
                return datetime.strptime(candidate, fmt)
            except ValueError:
                continue

    # fallback to date only
    date_only_match = re.search(r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", compact_text)
    if date_only_match:
        for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y"):
            try:
                return datetime.strptime(date_only_match.group(1), fmt)
            except ValueError:
                continue

    return None


def parse_sms_transaction(raw_text: str) -> ParsedSmsTransaction:
    normalized_text = " ".join(raw_text.split())
    amount, currency = _extract_amount_and_currency(normalized_text)

    return ParsedSmsTransaction(
        amount=amount,
        currency=currency,
        description=_extract_description(normalized_text),
        transaction_date=_extract_transaction_date(normalized_text),
        last_four_digits=_extract_last_four_digits(normalized_text),
    )
