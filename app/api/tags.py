from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import Tag, User
from app.schemas.schemas import TagCreate, TagResponse

router = APIRouter()


@router.get("/", response_model=list[TagResponse])
def list_tags(
    category_id: int | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Tag).filter(Tag.user_id == user.id)
    if category_id is not None:
        q = q.filter(Tag.category_id == category_id)
    return q.all()


@router.post("/", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
def create_tag(
    body: TagCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.category_id is not None:
        from app.models.models import Category
        if not db.query(Category).filter(
            Category.id == body.category_id, Category.user_id == user.id
        ).first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )

    tag = Tag(
        user_id=user.id,
        category_id=body.category_id,
        name_en=body.name_en,
        name_ar=body.name_ar,
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{id}")
def delete_tag(
    id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tag = db.query(Tag).filter(Tag.id == id, Tag.user_id == user.id).first()
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found",
        )

    db.delete(tag)
    db.commit()
    return {"message": "Tag deleted successfully"}
