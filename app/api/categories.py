from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import Category, CategoryType, LifecycleType, User
from app.schemas.schemas import CategoryCreate, CategoryResponse

router = APIRouter()


@router.get("/", response_model=list[CategoryResponse])
def list_categories(
    type: CategoryType | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Category).filter(Category.user_id == user.id)
    if type:
        q = q.filter(Category.type == type)
    return q.all()


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    body: CategoryCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.lifecycle_type == LifecycleType.monthly and body.fixed_monthly_amount is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="fixed_monthly_amount is required for monthly lifecycle",
        )
    if body.lifecycle_type == LifecycleType.event:
        if body.event_date is None or body.event_amount is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="event_date and event_amount are required for event lifecycle",
            )

    cat = Category(
        user_id=user.id,
        name_en=body.name_en,
        name_ar=body.name_ar,
        type=body.type,
        lifecycle_type=body.lifecycle_type,
        icon=body.icon,
        fixed_monthly_amount=body.fixed_monthly_amount,
        event_date=body.event_date,
        event_amount=body.event_amount,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{id}")
def delete_category(
    id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = (
        db.query(Category)
        .filter(Category.id == id, Category.user_id == user.id)
        .first()
    )
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully"}
