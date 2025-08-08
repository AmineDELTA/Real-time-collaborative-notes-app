from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List

from schemas.space import SpaceCreate, SpaceOut, SpaceUpdate
from services import crud_space
from db.session import get_db
from core.auth import get_current_user  # adjust with the auth module

router = APIRouter(
    prefix="/spaces",
    tags=["spaces"]
)
SessionDependency = Annotated[Session, Depends(get_db)]

