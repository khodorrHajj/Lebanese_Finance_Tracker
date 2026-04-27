"""add_recurring_transaction_schedules

Revision ID: 9f4c2b1a7e6d
Revises: 8d9a1c7f4e2b
Create Date: 2026-04-17
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "9f4c2b1a7e6d"
down_revision: Union[str, Sequence[str], None] = "8d9a1c7f4e2b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


currency_enum = postgresql.ENUM("LBP", "USD", name="currency", create_type=False)


def upgrade() -> None:
    op.execute("ALTER TYPE transactionsource ADD VALUE IF NOT EXISTS 'recurring'")

    op.create_table(
        "recurring_transaction_schedules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("institution_id", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("currency", currency_enum, nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("monthly_days", sa.String(length=100), nullable=True),
        sa.Column("include_last_day", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_recurring_transaction_schedules_user_id",
        "recurring_transaction_schedules",
        ["user_id"],
        unique=False,
    )

    op.add_column(
        "transactions",
        sa.Column("recurring_schedule_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_transactions_recurring_schedule_id",
        "transactions",
        "recurring_transaction_schedules",
        ["recurring_schedule_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_transactions_recurring_schedule_id", "transactions", type_="foreignkey")
    op.drop_column("transactions", "recurring_schedule_id")
    op.drop_index("ix_recurring_transaction_schedules_user_id", table_name="recurring_transaction_schedules")
    op.drop_table("recurring_transaction_schedules")
