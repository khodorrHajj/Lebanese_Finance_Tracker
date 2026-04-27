import enum
from datetime import datetime, date

from sqlalchemy import (
    Column, Integer, String, Boolean, Numeric, DateTime, Date, ForeignKey,
    Enum, Table, UniqueConstraint,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.models.base import Base


# ── Enums ────────────────────────────────────────────────────────────────────

class CategoryType(str, enum.Enum):
    income = "income"
    expense = "expense"


class LifecycleType(str, enum.Enum):
    standard = "standard"
    monthly = "monthly"
    event = "event"


class Currency(str, enum.Enum):
    LBP = "LBP"
    USD = "USD"


class TransactionStatus(str, enum.Enum):
    confirmed = "confirmed"
    pending = "pending"


class TransactionSource(str, enum.Enum):
    manual = "manual"
    ocr = "ocr"
    auto_card = "auto_card"
    recurring = "recurring"


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    prefer_not_to_say = "prefer_not_to_say"


# ── Association table ────────────────────────────────────────────────────────

transaction_tags = Table(
    "transaction_tags",
    Base.metadata,
    Column("transaction_id", Integer, ForeignKey("transactions.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


# ── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    gender: Mapped[Gender | None] = mapped_column(Enum(Gender), nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(2), default="en", server_default="en")
    default_currency: Mapped[str] = mapped_column(String(3), default="USD", server_default="USD")
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    auth_provider: Mapped[str] = mapped_column(String(20), default="email", server_default="email")
    otp_code: Mapped[str | None] = mapped_column(String(255), nullable=True)
    otp_purpose: Mapped[str | None] = mapped_column(String(50), nullable=True)
    otp_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    two_factor_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default="now()")
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default="now()", onupdate=datetime.utcnow)

    institutions: Mapped[list["Institution"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    categories: Mapped[list["Category"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    tags: Mapped[list["Tag"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    recurring_schedules: Mapped[list["RecurringTransactionSchedule"]] = relationship(cascade="all, delete-orphan")

    @property
    def has_password(self) -> bool:
        return bool(self.hashed_password)


class Institution(Base):
    __tablename__ = "institutions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    card_type: Mapped[str] = mapped_column(String(50), nullable=False)
    last_four_digits: Mapped[str | None] = mapped_column(String(4), nullable=True)
    current_balance: Mapped[float] = mapped_column(Numeric(15, 2), default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default="now()")

    user: Mapped["User"] = relationship(back_populates="institutions")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="institution")
    recurring_schedules: Mapped[list["RecurringTransactionSchedule"]] = relationship(back_populates="institution")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name_en: Mapped[str] = mapped_column(String(255), nullable=False)
    name_ar: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[CategoryType] = mapped_column(Enum(CategoryType), nullable=False)
    lifecycle_type: Mapped[LifecycleType] = mapped_column(Enum(LifecycleType), default=LifecycleType.standard, server_default="standard")
    fixed_monthly_amount: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    event_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    event_amount: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default="now()")

    user: Mapped["User"] = relationship(back_populates="categories")
    tags: Mapped[list["Tag"]] = relationship(back_populates="category")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="category")
    recurring_schedules: Mapped[list["RecurringTransactionSchedule"]] = relationship(back_populates="category")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    name_en: Mapped[str] = mapped_column(String(255), nullable=False)
    name_ar: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default="now()")

    user: Mapped["User"] = relationship(back_populates="tags")
    category: Mapped["Category | None"] = relationship(back_populates="tags")


class ExchangeRate(Base):
    __tablename__ = "exchange_rates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    rate: Mapped[float] = mapped_column(Numeric(15, 4), nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, server_default="now()")

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="exchange_rate")


class RecurringTransactionSchedule(Base):
    __tablename__ = "recurring_transaction_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id: Mapped[int] = mapped_column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False)
    category_id: Mapped[int] = mapped_column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    currency: Mapped[Currency] = mapped_column(Enum(Currency), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    monthly_days: Mapped[str | None] = mapped_column(String(100), nullable=True)
    include_last_day: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default="now()")

    user: Mapped["User"] = relationship()
    institution: Mapped["Institution"] = relationship(back_populates="recurring_schedules")
    category: Mapped["Category"] = relationship(back_populates="recurring_schedules")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="recurring_schedule")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True)
    category_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    recurring_schedule_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("recurring_transaction_schedules.id", ondelete="SET NULL"), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    currency: Mapped[Currency] = mapped_column(Enum(Currency), nullable=False)
    exchange_rate_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("exchange_rates.id", ondelete="SET NULL"), nullable=True)
    usd_equivalent: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    transaction_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[TransactionStatus] = mapped_column(Enum(TransactionStatus), default=TransactionStatus.confirmed, server_default="confirmed")
    source: Mapped[TransactionSource] = mapped_column(Enum(TransactionSource), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default="now()")

    user: Mapped["User"] = relationship(back_populates="transactions")
    institution: Mapped["Institution | None"] = relationship(back_populates="transactions")
    category: Mapped["Category | None"] = relationship(back_populates="transactions")
    exchange_rate: Mapped["ExchangeRate | None"] = relationship(back_populates="transactions")
    recurring_schedule: Mapped["RecurringTransactionSchedule | None"] = relationship(back_populates="transactions")
    tags: Mapped[list["Tag"]] = relationship(secondary=transaction_tags, back_populates="transactions_rel")


# Back-populate the other side of the M2M (Tag -> Transaction)
Tag.transactions_rel = relationship("Transaction", secondary=transaction_tags, back_populates="tags")
