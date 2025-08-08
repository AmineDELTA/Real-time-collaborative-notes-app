from sqlalchemy.orm import Session
from models import Space
from schemas import SpaceCreate, SpaceUpdate
from datetime import datetime, timezone


def create_space(db: Session, space_in: SpaceCreate, owner_id: int):
    db_space = Space(
        name=space_in.name,
        owner_id=owner_id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(db_space)
    db.commit()
    db.refresh(db_space)
    return db_space


def get_space_by_id(db: Session, space_id: int):
   return db.query(Space).filter(Space.id == space_id).first()


def get_spaces_by_owner(db: Session, owner_id: int):
    return db.query(Space).filter(Space.owner_id == owner_id).all()


def update_space(db: Session, space_id: int, space_in: SpaceUpdate):
    db_space = db.query(Space).filter(Space.id == space_id).first()
    if not db_space:
        return None
    
    if space_in.name is not None:
        db_space.name = space_in.name

    db.commit()
    db.refresh(db_space)
    return db_space


def delete_space(db: Session, space_id: int):
    db_space = db.query(Space).filter(Space.id == space_id).first()
    if not db_space:
        return None

    db.delete(db_space)
    db.commit()
    return db_space
