from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    PARTICIPANT = "participant"
    VISITOR = "visitor"

class UserInSpaceCreate(BaseModel):
    user_id: int
    space_id: int

class UserInSpaceUpdate(BaseModel):
    role: Optional[UserRole] = None
    is_creator: Optional[bool] = None

class RoleUpdate(BaseModel):
    role: UserRole

class UserInSpaceOut(BaseModel):
    user_id: int
    space_id: int
    role: UserRole
    is_creator: bool
    joined_at: datetime
    username: Optional[str] = None
    email: Optional[str] = None   
    
    # Include user details for frontend display
    user: Optional[dict] = None
    
    model_config = {"from_attributes": True}