from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Annotated

from app.models.user import User
from app.schemas.user_in_space import UserInSpaceCreate, UserInSpaceOut
from app.services.user_in_space import (
    add_user_to_space, get_users_in_space, remove_user_from_space
)
from app.services.space import get_space_by_id
from app.db.session import get_db
from app.core.auth import get_current_user 

router = APIRouter(tags=["user_in_space"])

SessionDependency = Annotated[Session, Depends(get_db)]
UserDependency = Annotated[User, Depends(get_current_user)]


@router.post("/", response_model=UserInSpaceOut)
def add_user(user_in_space_in: UserInSpaceCreate, db: SessionDependency, current_user: UserDependency):
    space = get_space_by_id(db, user_in_space_in.space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    if space.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return add_user_to_space(db=db, user_in_space_in=user_in_space_in)


@router.get("/space/{space_id}", response_model=list[UserInSpaceOut])
def list_users_in_space(space_id: int, db: SessionDependency, current_user: UserDependency):
    space = get_space_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    if space.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return get_users_in_space(db, space_id=space_id)


@router.delete("/{space_id}/{user_id}")
def remove_user(space_id: int, user_id: int, db: SessionDependency, current_user: UserDependency):
    space = get_space_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    if space.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    remove_user_from_space(db, space_id=space_id, user_id=user_id)
    return {"detail": "User removed from space successfully"}