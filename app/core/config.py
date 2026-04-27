import os
from dotenv import load_dotenv

load_dotenv()

APP_ENV: str = os.getenv("APP_ENV", "development").lower()
IS_PRODUCTION: bool = APP_ENV == "production"

DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/liratrack")
EXCHANGE_RATE_API_URL: str = os.getenv(
    "EXCHANGE_RATE_API_URL",
    "https://open.er-api.com/v6/latest/USD",
)
UNOFFICIAL_LBP_RATE_API_URL: str = os.getenv("UNOFFICIAL_LBP_RATE_API_URL", "")
RATE_FETCH_TIMEOUT_SECONDS: float = float(
    os.getenv("RATE_FETCH_TIMEOUT_SECONDS", "10"),
)

JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "local-development-secret")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
CORS_ALLOWED_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3003",
    ).split(",")
    if origin.strip()
]
CSRF_TRUSTED_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",")
    if origin.strip()
]

GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI: str = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:8000/api/v1/auth/google/callback",
)
FRONTEND_AUTH_CALLBACK_URL: str = os.getenv(
    "FRONTEND_AUTH_CALLBACK_URL",
    "http://localhost:3000/auth/callback",
)
SMTP_HOST: str = os.getenv("SMTP_HOST", "")
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
EMAIL_FROM: str = os.getenv("EMAIL_FROM", "")
ADMIN_CONTACT_EMAIL: str = os.getenv("ADMIN_CONTACT_EMAIL", "")

OCR_WARMUP_ON_STARTUP: bool = os.getenv("OCR_WARMUP_ON_STARTUP", "false").lower() == "true"


def validate_production_config() -> None:
    if not IS_PRODUCTION:
        return

    missing = []
    weak = []

    if not DATABASE_URL:
        missing.append("DATABASE_URL")
    if not CORS_ALLOWED_ORIGINS:
        missing.append("CORS_ALLOWED_ORIGINS")
    if JWT_SECRET_KEY in {"", "local-development-secret"}:
        weak.append("JWT_SECRET_KEY")
    if len(JWT_SECRET_KEY) < 32:
        weak.append("JWT_SECRET_KEY must be at least 32 characters")
    if GOOGLE_CLIENT_ID and not GOOGLE_CLIENT_SECRET:
        missing.append("GOOGLE_CLIENT_SECRET")
    if GOOGLE_CLIENT_SECRET and not GOOGLE_CLIENT_ID:
        missing.append("GOOGLE_CLIENT_ID")
    if "*" in CORS_ALLOWED_ORIGINS:
        weak.append("CORS_ALLOWED_ORIGINS cannot include *")

    if missing or weak:
        problems = []
        if missing:
            problems.append(f"missing: {', '.join(sorted(set(missing)))}")
        if weak:
            problems.append(f"weak/invalid: {', '.join(sorted(set(weak)))}")
        raise RuntimeError(
            "Invalid production configuration (" + "; ".join(problems) + ")"
        )
