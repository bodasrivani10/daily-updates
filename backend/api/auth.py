from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from ..models.base import get_db
from ..models.db_models import User


def get_current_user(
    x_user_id: int = Header(1, alias="X-User-Id", description="Simulated authenticated user ID"),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI security dependency extracting the active user context.
    Allows testing/switching users seamlessly via X-User-Id header.
    """
    user = db.query(User).filter(User.id == x_user_id).first()
    if not user:
        # Default fallback to first user or create a temporary one if empty
        user = db.query(User).first()
        if not user:
            raise HTTPException(status_code=401, detail="No users found in database.")
    return user


def require_roles(*allowed_roles: str):
    """
    Dependency factory enforcing RBAC role checks.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403, 
                detail=f"Access forbidden: requires one of {allowed_roles}, but current role is '{current_user.role}'"
            )
        return current_user
    return role_checker
