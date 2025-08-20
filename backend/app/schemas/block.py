from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class BlockBase(BaseModel):
    content: str
    type: Optional[str] = "text" 
    
    
class BlockCreate(BlockBase):
    space_id: int
    #order: Optional[int] = 0

class BlockUpdate(BaseModel):
    content: Optional[str] = None
    type: Optional[str] = None
    
    
class BlockOut(BlockBase):
    id: int
    owner_id: int
    space_id: int
    order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}