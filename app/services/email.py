import asyncio
import logging
import smtplib
from email.message import EmailMessage
from fastapi import HTTPException, status

from app.core.config import (
    ADMIN_CONTACT_EMAIL,
    EMAIL_FROM,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_USE_TLS,
)

logger = logging.getLogger("liratrack.email")


def _smtp_configured() -> bool:
    return bool(SMTP_HOST and EMAIL_FROM and SMTP_USERNAME and SMTP_PASSWORD)


def ensure_smtp_configured() -> None:
    if _smtp_configured():
        return

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            "Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, "
            "SMTP_USERNAME, SMTP_PASSWORD, and EMAIL_FROM in the backend environment."
        ),
    )


def _deliver_email_sync(to_email: str, subject: str, body: str) -> None:
    ensure_smtp_configured()

    message = EmailMessage()
    message["From"] = EMAIL_FROM
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.ehlo()
            if SMTP_USE_TLS:
                server.starttls()
                server.ehlo()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
    except smtplib.SMTPException as exc:
        logger.exception("SMTP delivery failed for %s", to_email)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to deliver email right now",
        ) from exc


async def _deliver_email(to_email: str, subject: str, body: str) -> None:
    await asyncio.to_thread(_deliver_email_sync, to_email, subject, body)


async def send_otp_email(email: str, otp: str, purpose: str) -> None:
    subject_map = {
        "email_verification": "Verify your LiraTrack email",
        "password_reset": "Reset your LiraTrack password",
        "magic_login": "Your LiraTrack login code",
    }
    body_map = {
        "email_verification": (
            "Welcome to LiraTrack.\n\n"
            f"Use this OTP to verify your email address: {otp}\n\n"
            "This code expires in 5 minutes."
        ),
        "password_reset": (
            "We received a password reset request for your LiraTrack account.\n\n"
            f"Use this OTP to reset your password: {otp}\n\n"
            "This code expires in 5 minutes."
        ),
        "magic_login": (
            "Use this OTP to sign in to your LiraTrack account.\n\n"
            f"OTP: {otp}\n\n"
            "This code expires in 5 minutes."
        ),
    }

    await _deliver_email(
        email,
        subject_map.get(purpose, "Your LiraTrack verification code"),
        body_map.get(
            purpose,
            f"Your LiraTrack OTP is {otp}. It expires in 5 minutes.",
        ),
    )


async def send_password_changed_email(email: str) -> None:
    await _deliver_email(
        email,
        "Your LiraTrack password was changed",
        (
            "This is a confirmation that your LiraTrack password has been changed.\n\n"
            "If you did not make this change, reset your password immediately."
        ),
    )


async def send_contact_admin_email(name: str, email: str, message: str) -> None:
    recipient = ADMIN_CONTACT_EMAIL or EMAIL_FROM
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Contact email is not configured",
        )

    await _deliver_email(
        recipient,
        f"LiraTrack contact message from {name}",
        f"From: {name} <{email}>\n\n{message}",
    )
