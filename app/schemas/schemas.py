from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.models import (
    CategoryType, LifecycleType, Currency, Gender, TransactionStatus, TransactionSource,
)


# ── Shared config ────────────────────────────────────────────────────────────

class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── User ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    phone_number: str = Field(min_length=7, max_length=32)
    phone_country: str = Field(min_length=2, max_length=2)
    gender: Gender
    password: str = Field(min_length=8)


class UserResponse(_Base):
    id: int
    email: EmailStr
    full_name: Optional[str]
    phone_number: Optional[str]
    gender: Optional[Gender]
    preferred_language: str
    default_currency: str
    email_verified: bool
    auth_provider: str
    has_password: bool
    two_factor_enabled: bool
    created_at: datetime


# ── Auth request/response ────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    requires_2fa: bool = False
    temp_token: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "bearer"


class RegisterResponse(BaseModel):
    email: EmailStr
    email_verification_required: bool = True


class OTPRequest(BaseModel):
    email: EmailStr


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


class GoogleAuthRequest(BaseModel):
    code: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class PasswordResetCodeResponse(BaseModel):
    message: str
    retry_after_seconds: int = Field(ge=0)


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8)


class ProfileUpdateRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    phone_number: str = Field(min_length=7, max_length=32)
    phone_country: str = Field(min_length=2, max_length=2)
    gender: Gender


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class SetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8)


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


class TwoFAVerifyRequest(BaseModel):
    temp_token: str
    totp_code: str = Field(min_length=6, max_length=6)


class EnableTwoFARequest(BaseModel):
    totp_code: str = Field(min_length=6, max_length=6)


class TwoFASetupResponse(BaseModel):
    qr_code_base64: str
    secret: str


# ── Institution / Wallet ─────────────────────────────────────────────────────

_CARD_TYPES = {"Visa", "Mastercard", "Cash_LBP", "Cash_USD", "Meza"}


class InstitutionCreate(BaseModel):
    name: str
    card_type: str = Field(pattern=r"^(" + "|".join(_CARD_TYPES) + r")$")
    last_four_digits: Optional[str] = Field(None, min_length=4, max_length=4)
    current_balance: Decimal = Field(
        default=Decimal("0.00"), ge=0, max_digits=15, decimal_places=2,
    )


class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    current_balance: Optional[Decimal] = Field(
        default=None, ge=0, max_digits=15, decimal_places=2,
    )


class InstitutionResponse(_Base):
    id: int
    user_id: int
    name: str
    card_type: str
    last_four_digits: Optional[str]
    current_balance: Decimal
    is_active: bool
    created_at: datetime


class WalletResponse(_Base):
    id: int
    user_id: int
    name: str
    card_type: str
    last_four_digits: Optional[str]
    current_balance: Decimal
    is_active: bool
    formatted_balance: str
    created_at: datetime


# ── Category ─────────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name_en: str
    name_ar: str
    type: CategoryType
    lifecycle_type: LifecycleType = LifecycleType.standard
    icon: Optional[str] = None
    fixed_monthly_amount: Optional[Decimal] = Field(None, max_digits=15, decimal_places=2)
    event_date: Optional[date] = None
    event_amount: Optional[Decimal] = Field(None, max_digits=15, decimal_places=2)


class CategoryResponse(_Base):
    id: int
    user_id: int
    name_en: str
    name_ar: str
    type: CategoryType
    lifecycle_type: LifecycleType
    fixed_monthly_amount: Optional[Decimal]
    event_date: Optional[date]
    event_amount: Optional[Decimal]
    icon: Optional[str]
    created_at: datetime


# ── Tag ──────────────────────────────────────────────────────────────────────

class TagCreate(BaseModel):
    name_en: str
    name_ar: str
    category_id: Optional[int] = None


class TagResponse(_Base):
    id: int
    user_id: int
    category_id: Optional[int]
    name_en: str
    name_ar: str
    created_at: datetime


# ── ExchangeRate ─────────────────────────────────────────────────────────────

class ExchangeRateResponse(_Base):
    id: int
    rate: Decimal
    source: str
    recorded_at: datetime


class SeedRateRequest(BaseModel):
    rate: Decimal = Field(gt=0, max_digits=15, decimal_places=4)


# ── Transaction ──────────────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    institution_id: Optional[int] = None
    category_id: Optional[int] = None
    amount: Decimal = Field(gt=0, max_digits=15, decimal_places=2)
    currency: Currency
    exchange_rate_id: Optional[int] = None
    usd_equivalent: Optional[Decimal] = Field(None, max_digits=15, decimal_places=2)
    description: Optional[str] = None
    transaction_date: datetime
    tag_ids: Optional[list[int]] = None


class TransactionUpdate(BaseModel):
    description: Optional[str] = None
    category_id: Optional[int] = None
    tag_ids: Optional[list[int]] = None


class _TagNested(_Base):
    id: int
    name_en: str
    name_ar: str


class _CategoryNested(_Base):
    id: int
    name_en: str
    name_ar: str
    type: CategoryType


class TransactionConfirmedResponse(_Base):
    id: int
    user_id: int
    institution_id: Optional[int]
    category: Optional[_CategoryNested]
    amount: Decimal
    currency: Currency
    exchange_rate_id: Optional[int]
    usd_equivalent: Decimal
    description: Optional[str]
    transaction_date: datetime
    status: TransactionStatus
    source: TransactionSource
    tags: list[_TagNested]
    created_at: datetime


class TransactionListResponse(_Base):
    id: int
    user_id: int
    institution_id: Optional[int]
    category: Optional[_CategoryNested]
    amount: Decimal
    currency: Currency
    usd_equivalent: Decimal
    description: Optional[str]
    transaction_date: datetime
    status: TransactionStatus
    source: TransactionSource
    tags: list[_TagNested]
    created_at: datetime


class ClaimPendingRequest(BaseModel):
    institution_id: Optional[int] = None
    amount: Decimal = Field(ge=0, max_digits=15, decimal_places=2)
    currency: Currency
    description: Optional[str] = None
    transaction_date: datetime
    category_id: int
    tag_ids: Optional[list[int]] = None


class SimulateVisaSpendRequest(BaseModel):
    institution_id: int
    amount: Decimal = Field(gt=0, max_digits=15, decimal_places=2)


class SmsTransactionCreateRequest(BaseModel):
    raw_text: str = Field(min_length=3, max_length=5000)
    institution_id: Optional[int] = None


class RecurringScheduleCreateRequest(BaseModel):
    institution_id: int
    category_id: int
    amount: Decimal = Field(gt=0, max_digits=15, decimal_places=2)
    currency: Currency
    description: Optional[str] = None
    start_date: date
    monthly_days: list[int] = Field(default_factory=list)
    include_last_day: bool = False


class RecurringScheduleResponse(_Base):
    id: int
    user_id: int
    institution_id: int
    category_id: int
    amount: Decimal
    currency: Currency
    description: Optional[str]
    start_date: date
    monthly_days: list[int]
    include_last_day: bool
    is_active: bool
    created_at: datetime


class PaginatedTransactionResponse(BaseModel):
    items: list[TransactionListResponse]
    total: int
    page: int
    page_size: int
    pages: int


class ContactAdminRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    message: str = Field(min_length=10, max_length=5000)


# ── Analytics ────────────────────────────────────────────────────────────────

class NetWorthResponse(BaseModel):
    total_lbp: Decimal
    total_usd: Decimal
    total_net_worth_usd: Decimal
    latest_rate: Optional[Decimal] = None
    rate_timestamp: Optional[datetime] = None


class ForecastResponse(BaseModel):
    expected_income: Decimal
    expected_expenses: Decimal
    projected_savings: Decimal


class SpendingBreakdownItem(BaseModel):
    category_id: int
    name_en: str
    name_ar: str
    total_spent_usd: Decimal


class RateHistoryItem(BaseModel):
    date: str
    rate: Decimal


# ── OCR ──────────────────────────────────────────────────────────────────────

class OCRScanResponse(BaseModel):
    id: int
    merchant: str
    amount: Optional[Decimal] = None
    currency: str
    transaction_date: datetime
    description: Optional[str] = None
    raw_text: str
    status: str = "pending"
    source: str = "ocr"
