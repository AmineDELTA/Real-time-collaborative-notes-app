import enum
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from enum import Enum


class BlockType(str, enum.Enum):
    TEXT = "TEXT"
    HEADING = "HEADING"
    BULLET_LIST = "BULLET_LIST"
    NUMBERED_LIST = "NUMBERED_LIST"

class BlockBase(BaseModel):
    content: Optional[str] = None
    type: BlockType = BlockType.TEXT
    
class BlockCreate(BlockBase):
    space_id: int

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
    order: int  # Add this - your database has it!

    model_config = {"from_attributes": True}