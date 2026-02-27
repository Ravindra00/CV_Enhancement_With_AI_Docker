"""
Admin routes — only accessible to users with is_superuser=True.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.models import User, CV
from app.dependencies import get_current_user
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Guard: require superuser ──────────────────────────────────────────────────

def require_superuser(current_user: User = Depends(get_current_user)):
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required"
        )
    return current_user


# ── Schemas ───────────────────────────────────────────────────────────────────

class UserAdminResponse(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool
    is_superuser: bool
    ai_access: bool
    cv_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    ai_access: Optional[bool] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[UserAdminResponse])
def list_all_users(
    admin: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """Get all registered users with their stats."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        cv_count = db.query(CV).filter(CV.user_id == u.id).count()
        result.append(UserAdminResponse(
            id=u.id,
            name=u.name,
            email=u.email,
            is_active=u.is_active if u.is_active is not None else True,
            is_superuser=u.is_superuser if u.is_superuser is not None else False,
            ai_access=u.ai_access if u.ai_access is not None else True,
            cv_count=cv_count,
            created_at=u.created_at,
        ))
    return result


@router.patch("/users/{user_id}", response_model=UserAdminResponse)
def update_user(
    user_id: int,
    body: UserUpdateRequest,
    admin: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """Update a user's access settings."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent superuser from accidentally demoting themselves
    if user.id == admin.id and body.is_superuser is False:
        raise HTTPException(status_code=400, detail="Cannot remove your own superuser access")

    if body.is_active is not None:
        user.is_active = body.is_active
    if body.is_superuser is not None:
        user.is_superuser = body.is_superuser
    if body.ai_access is not None:
        user.ai_access = body.ai_access

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    cv_count = db.query(CV).filter(CV.user_id == user.id).count()
    return UserAdminResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        ai_access=user.ai_access if user.ai_access is not None else True,
        cv_count=cv_count,
        created_at=user.created_at,
    )


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    admin: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """Permanently delete a user and all their data."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account via admin panel")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": f"User {user_id} deleted"}


@router.get("/stats")
def get_stats(
    admin: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """Dashboard stats for admin panel."""
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    ai_restricted = db.query(User).filter(User.ai_access == False).count()
    total_cvs = db.query(CV).count()
    return {
        "total_users": total_users,
        "active_users": active_users,
        "ai_restricted_users": ai_restricted,
        "inactive_users": total_users - active_users,
        "total_cvs": total_cvs,
    }
