from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SpaceBase(BaseModel):
    name:str
    description:Optional[str] = None
    
    
class SpaceCreate(SpaceBase):
    pass

class SpaceUpdate(SpaceBase):
    name: Optional[str] = None
    description: Optional[str] = None
    
    
class SpaceOut(BaseModel):
    id: int
    name: str
    owner_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}
    
