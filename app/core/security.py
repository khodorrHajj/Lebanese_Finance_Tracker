import secrets
from datetime import datetime, timedelta, timezone

import jwt
import pyotp
from passlib.context import CryptContext

from app.core.config import (
    JWT_SECRET_KEY, JWT_ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Password hashing ──────────────────────────────────────────────────────────

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT ────────────────────────────────────────────────────────────────────────

def _encode(payload: dict, expires_delta: timedelta) -> str:
    to_encode = payload.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_access_token(user_id: int) -> str:
    return _encode(
        {"sub": str(user_id), "type": "access"},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: int) -> str:
    return _encode(
        {"sub": str(user_id), "type": "refresh"},
        timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


def create_temp_token(user_id: int) -> str:
    """Short-lived token for 2FA challenge (5 min)."""
    return _encode(
        {"sub": str(user_id), "type": "temp_2fa"},
        timedelta(minutes=5),
    )


def create_google_oauth_state_token() -> str:
    """Short-lived signed state token for Google OAuth callbacks."""
    return _encode(
        {"type": "google_oauth_state"},
        timedelta(minutes=10),
    )


# ── OTP ────────────────────────────────────────────────────────────────────────

def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


# ── 2FA (TOTP) ────────────────────────────────────────────────────────────────

def generate_2fa_secret() -> str:
    return pyotp.random_base32()


def verify_2fa_code(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)
