from sqlalchemy.orm import Session
from app.models.space import Space
from app.schemas.space import SpaceCreate, SpaceUpdate
from datetime import datetime, timezone
from app.models.user_in_space import UserInSpace, UserRole
from typing import List, Dict, Any


def create_space(db: Session, space_in: SpaceCreate, owner_id: int):
    db_space = Space(
        name=space_in.name,
        owner_id=owner_id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(db_space)
    db.commit()
    db.refresh(db_space)
    
    admin_membership = UserInSpace(
        user_id=owner_id,
        space_id=db_space.id,
        role=UserRole.ADMIN,
        is_creator=True,
        joined_at=datetime.now(timezone.utc)
    )
    db.add(admin_membership)
    db.commit()
    db.refresh(admin_membership)
    return db_space


def get_space_by_id(db: Session, space_id: int):
   return db.query(Space).filter(Space.id == space_id).first()


def get_spaces_by_owner(db: Session, owner_id: int):
    return db.query(Space).filter(Space.owner_id == owner_id).all()


def get_spaces_by_user(db:Session, user_id:int):
    spaces = db.query(Space).join(UserInSpace).filter(UserInSpace.user_id == user_id).all()
    return spaces


def update_space(db: Session, space_id: int, space_in: SpaceUpdate):
    db_space = db.query(Space).filter(Space.id == space_id).first()
    if not db_space:
        return None
    
    update_data = space_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_space, key, value)

    db_space.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(db_space)
    return db_space


def delete_space(db: Session, space_id: int):
    db_space = db.query(Space).filter(Space.id == space_id).first()
    if db_space:
        db.delete(db_space)
        db.commit()
        return True
    return False


def get_user_spaces_with_roles(db: Session, user_id: int):
    result = db.query(Space, UserInSpace.role, UserInSpace.is_creator).join(UserInSpace).filter(UserInSpace.user_id == user_id).all()
    return [{"space": space, "role": role.value, "is_creator": is_creator} for space, role, is_creator in result]