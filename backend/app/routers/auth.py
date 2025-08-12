from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Annotated

from app.db.session import get_db
from app.core.auth import (create_access_token, authenticate_user, ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash)
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserOut
from app.services.user import create_user, get_user_by_email

router = APIRouter(prefix="/auth", tags=["auth"])

SessionDependency = Annotated[Session, Depends(get_db)]

