import re
from datetime import datetime
from decimal import Decimal


def parse_receipt_to_json(raw_text: str) -> dict:
    """Extract merchant, amount, currency, date from messy OCR text (EN/AR)."""
    lines = [ln.strip() for ln in raw_text.splitlines() if ln.strip()]

    # ── Merchant ──────────────────────────────────────────────────────────
    # Try to find the first line that isn't generic metadata like "TAX INVOICE"
    generic_headers = {"TAX INVOICE", "INVOICE", "RECEIPT", "فاتورة", "بون"}
    merchant = "Unknown"
    for line in lines[:3]:
        if line.upper() not in generic_headers and len(line) > 2:
            merchant = line
            break

    # ── Amount ─────────────────────────────────────────────────────────────
    amount: Decimal | None = None
    # Support common formats like "Total: 50.00" or "100,000 LBP"
    # We look for keywords followed by numbers, or large numbers followed by currency
    amount_patterns = [
        r"(?:Total|المجموع|MT|Amount|الإجمالي|المبلغ|NET)\s*:?\s*([\d,]+\.?\d*)",
        r"([\d,]{4,}\.?\d{0,2})\s*(?:LBP|ل\.ل|LL|USD|\$)",
        r"([\d,]+\.\d{2})", # Fallback for anything that looks like a decimal price
    ]

    # Try to find the LARGEST amount found near keywords, as it's usually the Total
    found_amounts = []
    for pat in amount_patterns:
        matches = re.finditer(pat, raw_text, re.IGNORECASE)
        for m in matches:
            try:
                val = Decimal(m.group(1).replace(",", ""))
                found_amounts.append(val)
            except Exception:
                continue

    if found_amounts:
        amount = max(found_amounts)

    # ── Currency ───────────────────────────────────────────────────────────
    currency = "USD"
    # Lebanon specific: LL, LBP, ل.ل are very common
    if re.search(r"(?:LBP|ل\.ل|LL|ليرة)", raw_text, re.IGNORECASE):
        currency = "LBP"
    elif re.search(r"\$|USD", raw_text, re.IGNORECASE):
        currency = "USD"
    # Heuristic: if amount is > 5000, it's almost certainly LBP in Lebanon
    if amount and amount > 5000 and currency == "USD":
        currency = "LBP"

    # ── Date ───────────────────────────────────────────────────────────────
    date_val: datetime | None = None
    date_patterns = [
        (r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", lambda m: datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)))),
        (r"(\d{4})[/-](\d{1,2})[/-](\d{1,2})", lambda m: datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))),
        (r"(\d{1,2})\.(\d{1,2})\.(\d{4})", lambda m: datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)))),
    ]
    for pat, builder in date_patterns:
        m = re.search(pat, raw_text)
        if m:
            try:
                date_val = builder(m)
                break
            except ValueError:
                continue

    return {
        "merchant": merchant,
        "amount": amount,
        "currency": currency,
        "date": date_val,
        "raw_text": raw_text,
    }
