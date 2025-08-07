from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class BlockBase(BaseModel):
    content: str
    type: Optional[str] = "text" 
    
    
class BlockCreate(BlockBase):
    space_id: int


class BlockUpdate(BaseModel):
    content: Optional[str] = None
    type: Optional[str] = None
    
    
class BlockOut(BlockBase):
    id: int
    creator_id: int
    space_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True