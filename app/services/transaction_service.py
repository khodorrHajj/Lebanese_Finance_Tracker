from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.models import (
    Category, Currency, ExchangeRate, Institution, Tag,
    RecurringTransactionSchedule,
    Transaction, TransactionSource, TransactionStatus,
    transaction_tags,
)
from app.schemas.schemas import TransactionCreate


class TransactionService:
    _LBP_WALLET_TYPES = {"Cash_LBP"}

    @staticmethod
    def _ensure_transaction_date_is_not_future(transaction_date) -> None:
        now = (
            datetime.now(transaction_date.tzinfo)
            if getattr(transaction_date, "tzinfo", None)
            else datetime.utcnow()
        )
        if transaction_date > now:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Future transaction dates are not allowed",
            )

    @staticmethod
    def _ensure_owned_wallet(
        db: Session,
        user_id: int,
        institution_id: int | None,
    ) -> Institution | None:
        if institution_id is None:
            return None

        institution = db.get(Institution, institution_id)
        if not institution or institution.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet not found",
            )
        return institution

    @staticmethod
    def _resolve_usd_equivalent(
        db: Session, amount: Decimal, currency: Currency,
    ) -> tuple[Decimal, int | None]:
        """Return (usd_equivalent, exchange_rate_id)."""
        if currency == Currency.USD:
            return amount, None

        # LBP → fetch latest rate
        row = (
            db.execute(
                select(ExchangeRate)
                .order_by(ExchangeRate.recorded_at.desc())
                .limit(1)
            )
            .scalar_one_or_none()
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exchange rate not configured",
            )
        usd = (amount / row.rate).quantize(Decimal("0.01"))
        return usd, row.id

    @staticmethod
    def _balance_delta(category_type: str, amount: Decimal) -> Decimal:
        return amount if category_type == "income" else -amount

    @classmethod
    def _wallet_balance_amount(
        cls,
        institution: Institution,
        amount: Decimal,
        usd_equivalent: Decimal,
    ) -> Decimal:
        if institution.card_type in cls._LBP_WALLET_TYPES:
            return amount
        return usd_equivalent

    # ── Public API ───────────────────────────────────────────────────────────

    @classmethod
    def create_transaction(
        cls,
        db: Session,
        user_id: int,
        payload: TransactionCreate | None = None,
        *,
        institution_id: int | None = None,
        category_id: int | None = None,
        amount: Decimal | None = None,
        currency: Currency | None = None,
        description: str | None = None,
        transaction_date=None,
        tag_ids: list[int] | None = None,
        source: TransactionSource = TransactionSource.manual,
        status_: TransactionStatus = TransactionStatus.confirmed,
        usd_equivalent_override: Decimal | None = None,
        recurring_schedule_id: int | None = None,
        allow_future_date: bool = False,
    ) -> Transaction:
        """
        Atomic transaction creation with optional balance update.
        - For confirmed transactions with a wallet: locks institution row and applies balance delta.
        - For confirmed transactions without a wallet: records the transaction without touching balances.
        - For pending (visa sim): skips balance update.
        """
        if payload is not None:
            institution_id = payload.institution_id
            category_id = payload.category_id
            amount = payload.amount
            currency = payload.currency
            description = payload.description
            transaction_date = payload.transaction_date
            tag_ids = payload.tag_ids
            if payload.usd_equivalent is not None and usd_equivalent_override is None:
                usd_equivalent_override = payload.usd_equivalent

        if amount is None or currency is None or transaction_date is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="amount, currency, and transaction_date are required",
            )
        if not allow_future_date:
            cls._ensure_transaction_date_is_not_future(transaction_date)

        # Category lookup (required for confirmed transactions)
        category_type = None
        if category_id:
            cat = db.get(Category, category_id)
            if not cat or cat.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Category not found",
                )
            category_type = cat.type.value

        # Dual-currency math
        if usd_equivalent_override is not None:
            usd_equivalent = usd_equivalent_override
            exchange_rate_id = None
        else:
            usd_equivalent, exchange_rate_id = cls._resolve_usd_equivalent(
                db, amount, currency,
            )

        # Build transaction row (not yet added)
        txn = Transaction(
            user_id=user_id,
            institution_id=institution_id,
            category_id=category_id,
            recurring_schedule_id=recurring_schedule_id,
            amount=amount,
            currency=currency,
            exchange_rate_id=exchange_rate_id,
            usd_equivalent=usd_equivalent,
            description=description,
            transaction_date=transaction_date,
            status=status_,
            source=source,
        )

        # ── Balance update (only for confirmed transactions) ─────────────
        if status_ == TransactionStatus.confirmed:
            if not category_type:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="category_id is required for confirmed transactions",
                )

            if institution_id is not None:
                with db.begin_nested():  # savepoint for atomic rollback
                    stmt = (
                        select(Institution)
                        .where(Institution.id == institution_id)
                        .with_for_update()
                    )
                    institution = db.execute(stmt).scalar_one_or_none()

                    if not institution or institution.user_id != user_id:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="Wallet not found",
                        )

                    balance_amount = cls._wallet_balance_amount(
                        institution,
                        amount,
                        usd_equivalent,
                    )
                    delta = cls._balance_delta(category_type, balance_amount)
                    institution.current_balance = Decimal(
                        str(institution.current_balance)
                    ) + delta

                    if institution.current_balance < 0:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Insufficient funds",
                        )

                    db.add(txn)
                    db.flush()

                    # Attach tags
                    if tag_ids:
                        cls._attach_tags(db, user_id, txn, tag_ids)
            else:
                db.add(txn)
                db.flush()
                if tag_ids:
                    cls._attach_tags(db, user_id, txn, tag_ids)
        else:
            # Pending transaction — no balance touch
            db.add(txn)
            db.flush()
            if tag_ids:
                cls._attach_tags(db, user_id, txn, tag_ids)

        db.commit()
        db.refresh(txn)
        return txn

    @classmethod
    def claim_pending(
        cls,
        db: Session,
        user_id: int,
        transaction_id: int,
        institution_id: int | None,
        amount: Decimal,
        currency: Currency,
        description: str | None,
        transaction_date,
        category_id: int,
        tag_ids: list[int] | None,
    ) -> Transaction:
        """Promote a pending transaction to confirmed + apply balance."""
        txn = db.get(Transaction, transaction_id)
        if not txn or txn.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found",
            )
        if txn.status != TransactionStatus.pending:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transaction is not pending",
            )

        cat = db.get(Category, category_id)
        if not cat or cat.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )

        cls._ensure_owned_wallet(db, user_id, institution_id)
        if amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="amount must be greater than zero",
            )
        cls._ensure_transaction_date_is_not_future(transaction_date)

        usd_equivalent, exchange_rate_id = cls._resolve_usd_equivalent(
            db, amount, currency,
        )

        txn.institution_id = institution_id
        txn.amount = amount
        txn.currency = currency
        txn.description = description
        txn.transaction_date = transaction_date
        txn.category_id = category_id
        txn.exchange_rate_id = exchange_rate_id
        txn.usd_equivalent = usd_equivalent
        txn.status = TransactionStatus.confirmed

        with db.begin_nested():
            stmt = (
                select(Institution)
                .where(Institution.id == txn.institution_id)
                .with_for_update()
            )
            institution = db.execute(stmt).scalar_one_or_none()
            if not institution:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Wallet not found",
                )

            balance_amount = cls._wallet_balance_amount(
                institution,
                Decimal(str(amount)),
                usd_equivalent,
            )
            delta = cls._balance_delta(cat.type.value, balance_amount)
            institution.current_balance = Decimal(
                str(institution.current_balance)
            ) + delta

            if institution.current_balance < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Insufficient funds",
                )

            # Replace tags
            if tag_ids:
                txn.tags = []
                db.flush()
                cls._attach_tags(db, user_id, txn, tag_ids)

            db.flush()

        db.commit()
        db.refresh(txn)
        return txn

    @classmethod
    def create_pending_sms_transaction(
        cls,
        db: Session,
        user_id: int,
        *,
        institution_id: int | None,
        amount: Decimal,
        currency: Currency,
        description: str | None,
        transaction_date,
    ) -> Transaction:
        cls._ensure_owned_wallet(db, user_id, institution_id)
        cls._ensure_transaction_date_is_not_future(transaction_date)

        usd_equivalent_override = None
        if amount <= 0:
            usd_equivalent_override = Decimal("0.00")
        elif amount > 0:
            usd_equivalent_override = (
                amount if currency == Currency.USD else None
            )

        return cls.create_transaction(
            db,
            user_id,
            institution_id=institution_id,
            category_id=None,
            amount=amount,
            currency=currency,
            description=description,
            transaction_date=transaction_date,
            tag_ids=None,
            source=TransactionSource.auto_card,
            status_=TransactionStatus.pending,
            usd_equivalent_override=usd_equivalent_override,
        )

    @classmethod
    def create_pending_recurring_transaction(
        cls,
        db: Session,
        user_id: int,
        *,
        recurring_schedule_id: int,
        institution_id: int,
        category_id: int,
        amount: Decimal,
        currency: Currency,
        description: str | None,
        transaction_date,
    ) -> Transaction:
        cls._ensure_owned_wallet(db, user_id, institution_id)

        return cls.create_transaction(
            db,
            user_id,
            institution_id=institution_id,
            category_id=category_id,
            amount=amount,
            currency=currency,
            description=description,
            transaction_date=transaction_date,
            tag_ids=None,
            source=TransactionSource.recurring,
            status_=TransactionStatus.pending,
            usd_equivalent_override=Decimal("0.00"),
            recurring_schedule_id=recurring_schedule_id,
            allow_future_date=True,
        )

    @classmethod
    def activate_recurring_pending_transaction(
        cls,
        db: Session,
        transaction_id: int,
    ) -> Transaction:
        txn = db.get(Transaction, transaction_id)
        if not txn:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found",
            )
        if txn.status != TransactionStatus.pending or txn.source != TransactionSource.recurring:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transaction is not a pending recurring transaction",
            )
        if txn.institution_id is None or txn.category_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recurring transaction is missing wallet or category",
            )

        category = db.get(Category, txn.category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )

        amount = Decimal(str(txn.amount))
        usd_equivalent, exchange_rate_id = cls._resolve_usd_equivalent(
            db, amount, txn.currency,
        )
        txn.exchange_rate_id = exchange_rate_id
        txn.usd_equivalent = usd_equivalent
        txn.status = TransactionStatus.confirmed

        with db.begin_nested():
            stmt = (
                select(Institution)
                .where(Institution.id == txn.institution_id)
                .with_for_update()
            )
            institution = db.execute(stmt).scalar_one_or_none()
            if institution is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Wallet not found",
                )

            balance_amount = cls._wallet_balance_amount(
                institution,
                amount,
                usd_equivalent,
            )
            delta = cls._balance_delta(category.type.value, balance_amount)
            institution.current_balance = Decimal(str(institution.current_balance)) + delta
            if institution.current_balance < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Insufficient funds",
                )
            db.flush()

        db.commit()
        db.refresh(txn)
        return txn

    @classmethod
    def update_confirmed_transaction(
        cls,
        db: Session,
        user_id: int,
        transaction_id: int,
        *,
        description_set: bool,
        description: str | None,
        category_id_set: bool,
        category_id: int | None,
        tag_ids_set: bool,
        tag_ids: list[int] | None,
    ) -> Transaction:
        txn = db.get(Transaction, transaction_id)
        if not txn or txn.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found",
            )
        if txn.status != TransactionStatus.confirmed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only confirmed transactions can be updated",
            )

        current_category = db.get(Category, txn.category_id) if txn.category_id else None
        new_category = current_category

        if category_id_set:
            if category_id is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="category_id cannot be null for confirmed transactions",
                )
            new_category = db.get(Category, category_id)
            if not new_category or new_category.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Category not found",
                )

        with db.begin_nested():
            if (
                txn.institution_id is not None
                and current_category is not None
                and new_category is not None
                and current_category.type != new_category.type
            ):
                stmt = (
                    select(Institution)
                    .where(Institution.id == txn.institution_id)
                    .with_for_update()
                )
                institution = db.execute(stmt).scalar_one_or_none()
                if not institution or institution.user_id != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Wallet not found",
                    )

                amount = Decimal(str(txn.amount))
                usd_equivalent = Decimal(str(txn.usd_equivalent))
                current_balance = Decimal(str(institution.current_balance))
                balance_amount = cls._wallet_balance_amount(
                    institution,
                    amount,
                    usd_equivalent,
                )
                old_delta = cls._balance_delta(
                    current_category.type.value,
                    balance_amount,
                )
                new_delta = cls._balance_delta(
                    new_category.type.value,
                    balance_amount,
                )

                institution.current_balance = current_balance - old_delta + new_delta
                if institution.current_balance < 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Insufficient funds",
                    )

            if description_set:
                txn.description = description
            if category_id_set and new_category is not None:
                txn.category_id = new_category.id
            if tag_ids_set:
                txn.tags = []
                db.flush()
                if tag_ids:
                    cls._attach_tags(db, user_id, txn, tag_ids)

            db.flush()

        db.commit()
        db.refresh(txn)
        return txn

    @classmethod
    def delete_transaction(
        cls,
        db: Session,
        user_id: int,
        transaction_id: int,
    ) -> None:
        txn = db.get(Transaction, transaction_id)
        if not txn or txn.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found",
            )

        if txn.status == TransactionStatus.confirmed and txn.institution_id is not None:
            category = db.get(Category, txn.category_id) if txn.category_id else None
            if category is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Confirmed transaction category is missing",
                )

            with db.begin_nested():
                stmt = (
                    select(Institution)
                    .where(Institution.id == txn.institution_id)
                    .with_for_update()
                )
                institution = db.execute(stmt).scalar_one_or_none()
                if not institution or institution.user_id != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Wallet not found",
                    )

                amount = Decimal(str(txn.amount))
                usd_equivalent = Decimal(str(txn.usd_equivalent))
                balance_amount = cls._wallet_balance_amount(
                    institution,
                    amount,
                    usd_equivalent,
                )
                reverse_delta = -cls._balance_delta(
                    category.type.value,
                    balance_amount,
                )
                institution.current_balance = Decimal(
                    str(institution.current_balance)
                ) + reverse_delta

                if institution.current_balance < 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Insufficient funds",
                    )

                db.delete(txn)
                db.flush()
        else:
            db.delete(txn)
            db.flush()

        db.commit()

    @staticmethod
    def _attach_tags(
        db: Session, user_id: int, txn: Transaction, tag_ids: list[int],
    ):
        tags = (
            db.query(Tag)
            .filter(Tag.id.in_(tag_ids), Tag.user_id == user_id)
            .all()
        )
        if len(tags) != len(tag_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more tags not found",
            )
        txn.tags = tags
        db.flush()
