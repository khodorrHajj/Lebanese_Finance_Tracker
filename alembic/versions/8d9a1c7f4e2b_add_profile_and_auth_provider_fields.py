"""add_profile_and_auth_provider_fields

Revision ID: 8d9a1c7f4e2b
Revises: 303ce0ae852f
Create Date: 2026-04-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8d9a1c7f4e2b"
down_revision: Union[str, Sequence[str], None] = "303ce0ae852f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


gender_enum = sa.Enum(
    "male",
    "female",
    "prefer_not_to_say",
    name="gender",
)


def upgrade() -> None:
    gender_enum.create(op.get_bind(), checkfirst=True)

    op.alter_column("users", "hashed_password", existing_type=sa.String(length=255), nullable=True)
    op.add_column("users", sa.Column("full_name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("phone_number", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("gender", gender_enum, nullable=True))
    op.add_column("users", sa.Column("email_verified", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("users", sa.Column("auth_provider", sa.String(length=20), server_default="email", nullable=False))
    op.add_column("users", sa.Column("otp_purpose", sa.String(length=50), nullable=True))

    op.execute("UPDATE users SET email_verified = true WHERE email_verified = false")
    op.execute("UPDATE users SET auth_provider = 'email' WHERE auth_provider IS NULL OR auth_provider = ''")


def downgrade() -> None:
    op.drop_column("users", "otp_purpose")
    op.drop_column("users", "auth_provider")
    op.drop_column("users", "email_verified")
    op.drop_column("users", "gender")
    op.drop_column("users", "phone_number")
    op.drop_column("users", "full_name")
    op.alter_column("users", "hashed_password", existing_type=sa.String(length=255), nullable=False)
    gender_enum.drop(op.get_bind(), checkfirst=True)
