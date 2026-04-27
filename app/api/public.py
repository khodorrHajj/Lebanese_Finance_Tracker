from fastapi import APIRouter, status

from app.schemas.schemas import ContactAdminRequest
from app.services.email import send_contact_admin_email

router = APIRouter()


@router.post("/contact-admin", status_code=status.HTTP_202_ACCEPTED)
async def contact_admin(body: ContactAdminRequest):
    await send_contact_admin_email(
        name=body.name.strip(),
        email=body.email,
        message=body.message.strip(),
    )
    return {"message": "Message sent successfully"}
