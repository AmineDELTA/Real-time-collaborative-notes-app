from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Annotated

from app.models.user import User
from app.schemas.space import SpaceCreate, SpaceOut, SpaceUpdate
from app.services.space import create_space, get_space_by_id, update_space, delete_space, get_spaces_by_owner
from app.db.session import get_db
from app.core.auth import get_current_user  # adjust with the auth module

router = APIRouter(
    prefix="/spaces",
    tags=["spaces"]
)
SessionDependency = Annotated[Session, Depends(get_db)]
UserDependency = Annotated[User, Depends(get_current_user)]

@router.post("/", response_model=SpaceOut)
def create_new_space(space_in: SpaceCreate, db: SessionDependency, current_user: UserDependency):
    return create_space(db=db, space_in=space_in, owner_id=current_user.id)


@router.get("/{space_id}", response_model=SpaceOut)
def read_space(space_id: int, db: SessionDependency, current_user: UserDependency):
    space = get_space_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    
    # Add authorization check
    if space.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return space


@router.get("/", response_model=list[SpaceOut])
def read_spaces(db: SessionDependency, current_user: UserDependency):
    # Return only spaces owned by user,
    return get_spaces_by_owner(db, owner_id=current_user.id)


@router.put("/{space_id}", response_model=SpaceOut)
def update_existing_space(
    space_id: int, space_in: SpaceUpdate, db: SessionDependency, current_user: UserDependency):
    db_space = get_space_by_id(db, space_id)
    if not db_space:
        raise HTTPException(status_code=404, detail="Space not found")

    if db_space.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return update_space(db=db, db_space=db_space, space_in=space_in)


@router.delete("/{space_id}")
def delete_existing_space(space_id: int, db: SessionDependency, current_user: UserDependency):
    db_space = get_space_by_id(db, space_id)
    if not db_space:
        raise HTTPException(status_code=404, detail="Space not found")

    if db_space.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    delete_space(db=db, db_space=db_space)
    return {"detail": "Space deleted successfully"}