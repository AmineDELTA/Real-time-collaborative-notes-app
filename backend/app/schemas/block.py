from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from enum import Enum


class BlockType(str, Enum):
    TEXT = "text"
    HEADING = "heading"
    BULLET_LIST = "bullet_list"
    NUMBERED_LIST = "numbered_list"

class BlockBase(BaseModel):
    content: Optional[str] = None
    type: BlockType = BlockType.TEXT
    order: int
    
class BlockCreate(BlockBase):
    space_id: int
    #order: Optional[int] = 0

class BlockUpdate(BaseModel):
    content: Optional[str] = None
    type: Optional[BlockType] = None
    order: Optional[int] = None
    
class BlockOut(BlockBase):
    id: int 
    owner_id: int
    space_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}