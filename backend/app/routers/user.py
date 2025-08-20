from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.services.user import create_user, get_user,  get_user_by_email, update_user_db, delete_user_db
from app.db.session import get_db

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

SessionDependency = Annotated[Session, Depends(get_db)]

@router.get("/{user_id}", response_model=UserOut)
def get_user_by_id(user_id: int, db: SessionDependency):
    db_user = get_user(db, user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@router.post("/", response_model=UserOut, status_code=201)
def build_user(user_in: UserCreate, db: SessionDependency):
    db_user = get_user_by_email(db, user_in.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return create_user(db, user_in)


@router.put("/{user_id}", response_model=UserOut)
def change_user(user_id: int, updated_data: UserUpdate, db: SessionDependency):
    user = get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    updated_user = update_user_db(db, user_id, updated_data)
    return updated_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: SessionDependency):
    deleted = delete_user_db(db, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)