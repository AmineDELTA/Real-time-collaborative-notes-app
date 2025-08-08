from sqlalchemy.orm import Session
from datetime import datetime, timezone
from models import UserInSpace
from schemas import UserInSpaceCreate


def add_user_to_space(db: Session, user_in_space_in: UserInSpaceCreate):
    db_membership = UserInSpace(
        user_id=user_in_space_in.user_id,
        space_id=user_in_space_in.space_id,
        role=user_in_space_in.role,
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
        membership.role = new_role
        db.commit()
        db.refresh(membership)
    return membership