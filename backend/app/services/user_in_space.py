from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.models.user_in_space import UserInSpace, UserRole
from app.schemas.user_in_space import UserInSpaceCreate
from fastapi import HTTPException

def add_user_to_space(db: Session, user_in_space_in: UserInSpaceCreate):
    existing = db.query(UserInSpace).filter(
        UserInSpace.user_id == user_in_space_in.user_id,
        UserInSpace.space_id == user_in_space_in.space_id
    ).first()
    
    if existing:
        return existing
    
    if isinstance(user_in_space_in.role, str):
        role_enum = UserRole(user_in_space_in.role)
    else:
        role_enum = user_in_space_in.role
        
    db_membership = UserInSpace(
        user_id=user_in_space_in.user_id,
        space_id=user_in_space_in.space_id,
        role=role_enum,
        is_creator=False,
        joined_at=datetime.now(timezone.utc)
    )
    db.add(db_membership)
    db.commit()
    db.refresh(db_membership)
    return db_membership


def get_users_in_space(db: Session, space_id: int):
    return db.query(UserInSpace).filter(UserInSpace.space_id == space_id).all()


def remove_user_from_space(db: Session, user_id: int, space_id: int):
    membership = db.query(UserInSpace).filter(
        UserInSpace.user_id == user_id,
        UserInSpace.space_id == space_id
    ).first()
    if membership:
        db.delete(membership)
        db.commit()
    return membership


def update_user_role(db: Session, user_id: int, space_id: int, new_role: str):
    membership = db.query(UserInSpace).filter(
        UserInSpace.user_id == user_id,
        UserInSpace.space_id == space_id
    ).first()
    if membership:
        
        if isinstance(new_role, str):
            membership.role = UserRole(new_role)  # "admin" -> UserRole.ADMIN
        else:
            membership.role = new_role
        db.commit()
        db.refresh(membership)
    return membership