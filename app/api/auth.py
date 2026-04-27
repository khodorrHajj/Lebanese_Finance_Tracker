import base64
import io
import math
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
import phonenumbers
import pyotp
import qrcode
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import (
    FRONTEND_AUTH_CALLBACK_URL,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
)
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_google_oauth_state_token,
    create_refresh_token,
    create_temp_token,
    decode_token,
    generate_2fa_secret,
    generate_otp,
    get_password_hash,
    verify_2fa_code,
    verify_password,
)
from app.models.models import User
from app.schemas.schemas import (
    ChangePasswordRequest,
    EnableTwoFARequest,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    LoginResponse,
    OTPRequest,
    OTPVerifyRequest,
    PasswordResetCodeResponse,
    ProfileUpdateRequest,
    RegisterResponse,
    ResetPasswordRequest,
    SetPasswordRequest,
    TokenResponse,
    TwoFASetupResponse,
    TwoFAVerifyRequest,
    UserCreate,
    UserResponse,
    VerifyEmailRequest,
)
from app.services.email import ensure_smtp_configured, send_otp_email, send_password_changed_email

router = APIRouter()

OTP_PURPOSE_EMAIL_VERIFICATION = "email_verification"
OTP_PURPOSE_PASSWORD_RESET = "password_reset"
OTP_PURPOSE_MAGIC_LOGIN = "magic_login"

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_SCOPE = "email profile"
POSTMESSAGE_REDIRECT_URI = "postmessage"
OTP_TTL = timedelta(minutes=5)


def _get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email.lower().strip()).first()


def _get_user_by_phone_number(db: Session, phone_number: str) -> User | None:
    return db.query(User).filter(User.phone_number == phone_number).first()


def _build_tokens(user_id: int) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )


def _normalize_phone_number(phone_number: str, phone_country: str) -> str:
    normalized = phone_number.strip()
    region = phone_country.strip().upper()

    if len(region) != 2 or not region.isalpha():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Select a valid phone country",
        )

    try:
        parsed_number = phonenumbers.parse(normalized, region)
    except phonenumbers.NumberParseException:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Enter a valid phone number for the selected country",
        ) from None

    if not phonenumbers.is_valid_number_for_region(parsed_number, region):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Enter a valid phone number for the selected country",
        )

    return phonenumbers.format_number(
        parsed_number,
        phonenumbers.PhoneNumberFormat.E164,
    )


def _merge_auth_provider(current: str, incoming: str) -> str:
    providers = {part for part in current.split("+") if part}
    providers.add(incoming)
    return "+".join(sorted(providers))


def _clear_user_otp(user: User) -> None:
    user.otp_code = None
    user.otp_purpose = None
    user.otp_expires_at = None


async def _send_password_changed_email_safely(email: str) -> None:
    try:
        await send_password_changed_email(email)
    except HTTPException:
        # Password changes should not fail after commit just because notification email failed.
        return


def _serialize_otp_purpose(purpose: str, sequence: int | None = None) -> str:
    if sequence is None:
        return purpose
    return f"{purpose}|{sequence}"


def _parse_otp_purpose(raw_value: str | None) -> tuple[str | None, int | None]:
    if not raw_value:
        return None, None

    purpose, separator, sequence_raw = raw_value.partition("|")
    if not separator:
        return raw_value, None

    try:
        return purpose, int(sequence_raw)
    except ValueError:
        return purpose, None


def _issue_user_otp(
    db: Session,
    user: User,
    purpose: str,
    *,
    sequence: int | None = None,
) -> str:
    otp = generate_otp()
    user.otp_code = get_password_hash(otp)
    user.otp_purpose = _serialize_otp_purpose(purpose, sequence)
    user.otp_expires_at = datetime.now(timezone.utc) + OTP_TTL
    db.commit()
    db.refresh(user)
    return otp


def _validate_user_otp(user: User, otp: str, purpose: str) -> None:
    stored_purpose, _ = _parse_otp_purpose(user.otp_purpose)
    if not user.otp_code or not user.otp_expires_at or stored_purpose != purpose:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP",
        )

    expires_at = user.otp_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="OTP expired",
        )

    if not verify_password(otp, user.otp_code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP",
        )


def _get_otp_issued_at(user: User) -> datetime | None:
    if not user.otp_expires_at:
        return None

    expires_at = user.otp_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    return expires_at - OTP_TTL


def _password_reset_retry_after_seconds(sequence: int) -> int:
    if sequence <= 1:
        return 30
    if sequence == 2:
        return 60
    if sequence <= 5:
        return 120
    return 1800


def _get_password_reset_sequence(user: User) -> int:
    purpose, sequence = _parse_otp_purpose(user.otp_purpose)
    if purpose != OTP_PURPOSE_PASSWORD_RESET or sequence is None or sequence < 1:
        return 0
    return sequence


def _get_password_reset_cooldown_remaining(user: User) -> int:
    sequence = _get_password_reset_sequence(user)
    if sequence == 0:
        return 0

    issued_at = _get_otp_issued_at(user)
    if issued_at is None:
        return 0

    elapsed_seconds = (datetime.now(timezone.utc) - issued_at).total_seconds()
    cooldown_seconds = _password_reset_retry_after_seconds(sequence)
    return max(0, math.ceil(cooldown_seconds - elapsed_seconds))


def _email_verification_retry_after_seconds() -> int:
    return 60


def _get_email_verification_cooldown_remaining(user: User) -> int:
    purpose, _ = _parse_otp_purpose(user.otp_purpose)
    if purpose != OTP_PURPOSE_EMAIL_VERIFICATION:
        return 0

    issued_at = _get_otp_issued_at(user)
    if issued_at is None:
        return 0

    elapsed_seconds = (datetime.now(timezone.utc) - issued_at).total_seconds()
    return max(0, math.ceil(_email_verification_retry_after_seconds() - elapsed_seconds))


async def _send_password_reset_code(
    db: Session,
    user: User,
    *,
    sequence: int,
) -> PasswordResetCodeResponse:
    otp = _issue_user_otp(
        db,
        user,
        OTP_PURPOSE_PASSWORD_RESET,
        sequence=sequence,
    )
    await send_otp_email(user.email, otp, OTP_PURPOSE_PASSWORD_RESET)
    return PasswordResetCodeResponse(
        message="Password reset code sent",
        retry_after_seconds=_password_reset_retry_after_seconds(sequence),
    )


def _ensure_google_oauth_configured() -> None:
    placeholders = {"", "your_google_client_id", "your_google_client_secret"}
    if GOOGLE_CLIENT_ID in placeholders or GOOGLE_CLIENT_SECRET in placeholders:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and "
                "GOOGLE_CLIENT_SECRET in the backend environment."
            ),
        )


async def _exchange_google_code(code: str, redirect_uri: str) -> str:
    _ensure_google_oauth_configured()
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )

    if token_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token exchange failed",
        )

    return token_resp.json()["access_token"]


async def _fetch_google_userinfo(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if userinfo_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to fetch Google user info",
        )

    return userinfo_resp.json()


def _build_login_response_for_user(user: User) -> LoginResponse:
    if user.two_factor_enabled:
        return LoginResponse(
            requires_2fa=True,
            temp_token=create_temp_token(user.id),
        )

    tokens = _build_tokens(user.id)
    return LoginResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
    )


def _upsert_google_user(db: Session, email: str, full_name: str | None) -> User:
    normalized_email = email.lower().strip()
    user = _get_user_by_email(db, normalized_email)
    if not user:
        user = User(
            email=normalized_email,
            full_name=full_name,
            hashed_password=None,
            email_verified=True,
            auth_provider="google",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    if full_name and not user.full_name:
        user.full_name = full_name

    user.email_verified = True
    user.auth_provider = _merge_auth_provider(user.auth_provider, "google")
    db.commit()
    db.refresh(user)
    return user


async def _authenticate_google_user(
    code: str,
    db: Session,
    redirect_uri: str,
) -> LoginResponse:
    access_token = await _exchange_google_code(code, redirect_uri)
    guser = await _fetch_google_userinfo(access_token)
    email = guser.get("email")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account has no email",
        )

    user = _upsert_google_user(db, email, guser.get("name"))
    return _build_login_response_for_user(user)


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate, db: Session = Depends(get_db)):
    normalized_phone_number = _normalize_phone_number(
        body.phone_number,
        body.phone_country,
    )
    existing_user = _get_user_by_email(db, body.email)
    if existing_user:
        if not existing_user.email_verified and "email" in existing_user.auth_provider.split("+"):
            if existing_user.phone_number != normalized_phone_number:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email already registered",
                )

            ensure_smtp_configured()
            cooldown_remaining = _get_email_verification_cooldown_remaining(existing_user)
            if cooldown_remaining > 0:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "message": "Please wait before requesting another verification code",
                        "retry_after_seconds": cooldown_remaining,
                    },
                )

            existing_user.full_name = body.full_name.strip()
            existing_user.gender = body.gender
            existing_user.hashed_password = get_password_hash(body.password)
            existing_user.auth_provider = _merge_auth_provider(
                existing_user.auth_provider,
                "email",
            )
            db.commit()
            db.refresh(existing_user)
            otp = _issue_user_otp(
                db,
                existing_user,
                OTP_PURPOSE_EMAIL_VERIFICATION,
            )
            await send_otp_email(
                existing_user.email,
                otp,
                OTP_PURPOSE_EMAIL_VERIFICATION,
            )
            return RegisterResponse(
                email=existing_user.email,
                email_verification_required=True,
            )

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    existing_phone_user = _get_user_by_phone_number(db, normalized_phone_number)
    if existing_phone_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already registered",
        )

    ensure_smtp_configured()

    user = User(
        email=body.email.lower().strip(),
        full_name=body.full_name.strip(),
        phone_number=normalized_phone_number,
        gender=body.gender,
        hashed_password=get_password_hash(body.password),
        email_verified=False,
        auth_provider="email",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    otp = _issue_user_otp(db, user, OTP_PURPOSE_EMAIL_VERIFICATION)
    await send_otp_email(user.email, otp, OTP_PURPOSE_EMAIL_VERIFICATION)

    return RegisterResponse(
        email=user.email,
        email_verification_required=True,
    )


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    return user


@router.put("/profile", response_model=UserResponse)
def update_profile(
    body: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    normalized_phone_number = _normalize_phone_number(
        body.phone_number,
        body.phone_country,
    )
    existing_phone_user = _get_user_by_phone_number(db, normalized_phone_number)
    if existing_phone_user and existing_phone_user.id != user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already registered",
        )

    user.full_name = body.full_name.strip()
    user.phone_number = normalized_phone_number
    user.gender = body.gender
    db.commit()
    db.refresh(user)
    return user


@router.delete("/me")
def delete_account(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.delete(user)
    db.commit()
    return {"message": "Account deleted successfully"}


@router.post("/verify-email", response_model=TokenResponse)
def verify_email(
    body: VerifyEmailRequest,
    db: Session = Depends(get_db),
):
    user = _get_user_by_email(db, body.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP",
        )

    _validate_user_otp(user, body.otp, OTP_PURPOSE_EMAIL_VERIFICATION)
    user.email_verified = True
    _clear_user_otp(user)
    db.commit()
    return _build_tokens(user.id)


@router.post("/resend-email-verification")
async def resend_email_verification(
    body: OTPRequest,
    db: Session = Depends(get_db),
):
    ensure_smtp_configured()
    user = _get_user_by_email(db, body.email)
    if not user:
        return {
            "message": "If the email exists, a verification code has been sent",
            "retry_after_seconds": _email_verification_retry_after_seconds(),
        }

    if user.email_verified:
        return {"message": "Email is already verified"}

    cooldown_remaining = _get_email_verification_cooldown_remaining(user)
    if cooldown_remaining > 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": "Please wait before requesting another verification code",
                "retry_after_seconds": cooldown_remaining,
            },
        )

    otp = _issue_user_otp(db, user, OTP_PURPOSE_EMAIL_VERIFICATION)
    await send_otp_email(user.email, otp, OTP_PURPOSE_EMAIL_VERIFICATION)
    return {
        "message": "If the email exists, a verification code has been sent",
        "retry_after_seconds": _email_verification_retry_after_seconds(),
    }


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = _get_user_by_email(db, body.email)
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not user.email_verified and "email" in user.auth_provider.split("+"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required",
        )

    return _build_login_response_for_user(user)


@router.post("/verify-2fa", response_model=TokenResponse)
def verify_2fa(body: TwoFAVerifyRequest, db: Session = Depends(get_db)):
    payload = decode_token(body.temp_token)
    if not payload or payload.get("type") != "temp_2fa":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired temp token",
        )

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user or not user.two_factor_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not verify_2fa_code(user.two_factor_secret, body.totp_code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 2FA code",
        )

    return _build_tokens(user.id)


@router.post("/request-otp")
async def request_otp(body: OTPRequest, db: Session = Depends(get_db)):
    ensure_smtp_configured()
    user = _get_user_by_email(db, body.email)
    if not user:
        return {"message": "If the email exists, an OTP has been sent"}

    otp = _issue_user_otp(db, user, OTP_PURPOSE_MAGIC_LOGIN)
    await send_otp_email(user.email, otp, OTP_PURPOSE_MAGIC_LOGIN)
    return {"message": "If the email exists, an OTP has been sent"}


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(body: OTPVerifyRequest, db: Session = Depends(get_db)):
    user = _get_user_by_email(db, body.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP",
        )

    _validate_user_otp(user, body.otp, OTP_PURPOSE_MAGIC_LOGIN)
    _clear_user_otp(user)
    db.commit()
    return _build_tokens(user.id)


@router.post("/google", response_model=LoginResponse)
async def google_auth(body: GoogleAuthRequest, db: Session = Depends(get_db)):
    return await _authenticate_google_user(body.code, db, POSTMESSAGE_REDIRECT_URI)


@router.get("/google/callback")
async def google_callback(
    db: Session = Depends(get_db),
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
):
    if error:
        return RedirectResponse(
            url=f"{FRONTEND_AUTH_CALLBACK_URL}?error={error}",
            status_code=status.HTTP_302_FOUND,
        )

    if not code:
        return RedirectResponse(
            url=f"{FRONTEND_AUTH_CALLBACK_URL}?error=missing_code",
            status_code=status.HTTP_302_FOUND,
        )

    payload = decode_token(state) if state else None
    if not payload or payload.get("type") != "google_oauth_state":
        return RedirectResponse(
            url=f"{FRONTEND_AUTH_CALLBACK_URL}?error=invalid_state",
            status_code=status.HTTP_302_FOUND,
        )

    try:
        login_response = await _authenticate_google_user(code, db, GOOGLE_REDIRECT_URI)
    except HTTPException as exc:
        redirect_query = urlencode({"error": str(exc.detail)})
        return RedirectResponse(
            url=f"{FRONTEND_AUTH_CALLBACK_URL}?{redirect_query}",
            status_code=status.HTTP_302_FOUND,
        )
    redirect_payload = {"requires_2fa": str(login_response.requires_2fa).lower()}

    if login_response.requires_2fa and login_response.temp_token:
        redirect_payload["temp_token"] = login_response.temp_token
    elif login_response.access_token and login_response.refresh_token:
        redirect_payload["access_token"] = login_response.access_token
        redirect_payload["refresh_token"] = login_response.refresh_token
    else:
        redirect_payload["error"] = "missing_tokens"

    redirect_query = urlencode(redirect_payload)
    return RedirectResponse(
        url=f"{FRONTEND_AUTH_CALLBACK_URL}?{redirect_query}",
        status_code=status.HTTP_302_FOUND,
    )


@router.get("/google/auth-url")
def google_auth_url():
    _ensure_google_oauth_configured()
    state = create_google_oauth_state_token()
    query = urlencode(
        {
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": GOOGLE_SCOPE,
            "prompt": "select_account",
            "state": state,
        }
    )
    return {"url": f"{GOOGLE_AUTH_URL}?{query}"}


@router.post("/forgot-password", response_model=PasswordResetCodeResponse)
async def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    ensure_smtp_configured()
    user = _get_user_by_email(db, body.email)
    if not user:
        return PasswordResetCodeResponse(
            message="Password reset code requested",
            retry_after_seconds=_password_reset_retry_after_seconds(1),
        )

    return await _send_password_reset_code(db, user, sequence=1)


@router.post("/resend-password-reset-code", response_model=PasswordResetCodeResponse)
async def resend_password_reset_code(
    body: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    ensure_smtp_configured()
    user = _get_user_by_email(db, body.email)
    if not user:
        return PasswordResetCodeResponse(
            message="Password reset code requested",
            retry_after_seconds=_password_reset_retry_after_seconds(1),
        )

    cooldown_remaining = _get_password_reset_cooldown_remaining(user)
    if cooldown_remaining > 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": "Please wait before requesting another reset code",
                "retry_after_seconds": cooldown_remaining,
            },
        )

    next_sequence = max(1, _get_password_reset_sequence(user) + 1)
    return await _send_password_reset_code(db, user, sequence=next_sequence)


@router.post("/reset-password", response_model=TokenResponse)
async def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = _get_user_by_email(db, body.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP",
        )

    _validate_user_otp(user, body.otp, OTP_PURPOSE_PASSWORD_RESET)
    if user.hashed_password and verify_password(body.new_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password",
        )
    user.hashed_password = get_password_hash(body.new_password)
    user.auth_provider = _merge_auth_provider(user.auth_provider, "email")
    _clear_user_otp(user)
    db.commit()
    await _send_password_changed_email_safely(user.email)
    return _build_tokens(user.id)


@router.post("/set-password")
async def set_password(
    body: SetPasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.has_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is already set",
        )

    if user.hashed_password and verify_password(body.new_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password",
        )

    user.hashed_password = get_password_hash(body.new_password)
    user.auth_provider = _merge_auth_provider(user.auth_provider, "email")
    db.commit()
    await _send_password_changed_email_safely(user.email)
    return {"message": "Password set successfully"}


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Set a password first",
        )

    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    if verify_password(body.new_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password",
        )

    user.hashed_password = get_password_hash(body.new_password)
    db.commit()
    await _send_password_changed_email_safely(user.email)
    return {"message": "Password changed successfully"}


@router.post("/setup-2fa", response_model=TwoFASetupResponse)
def setup_2fa(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    secret = generate_2fa_secret()
    user.two_factor_secret = secret
    db.commit()

    uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user.email,
        issuer_name="LiraTrack",
    )

    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    return TwoFASetupResponse(qr_code_base64=qr_b64, secret=secret)


@router.post("/enable-2fa")
def enable_2fa(
    body: EnableTwoFARequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user.two_factor_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Set up 2FA first",
        )

    if not verify_2fa_code(user.two_factor_secret, body.totp_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 2FA code",
        )

    user.two_factor_enabled = True
    db.commit()
    return {"message": "2FA enabled successfully"}
