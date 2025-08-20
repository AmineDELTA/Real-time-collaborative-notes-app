from pydantic import BaseModel
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    PARTICIPANT = "participant"
    VISITOR = "visitor"

class UserInSpaceBase(BaseModel):
    user_id: int
    space_id: int
    role: UserRole
    
class UserInSpaceCreate(UserInSpaceBase):
    pass
    
    
class UserInSpaceUpdate(BaseModel):
    role: UserRole
    
    
class UserInSpaceOut(UserInSpaceBase):
    id: int
    joined_at: datetime
    is_creator: bool

    model_config = {"from_attributes": True}