from pydantic import BaseModel
from datetime import datetime


class UserInSpaceBase(BaseModel):
    role: str
    
    
class UserInSpaceCreate(UserInSpaceBase):
    user_id: int
    space_id: int
    
    
class UserInSpaceUpdate(BaseModel):
    role: str
    
    
class UserInSpaceOut(UserInSpaceBase):
    id: int
    user_id: int
    space_id: int
    joined_at: datetime

    class Config:
        orm_mode = True