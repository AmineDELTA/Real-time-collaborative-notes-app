from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Annotated

from app.models.user import User
from app.schemas.block import BlockCreate, BlockOut, BlockUpdate
from app.services.block import (
    create_block, get_block_by_id, update_block, delete_block, get_blocks_in_space
)
from app.services.space import get_space_by_id
from app.db.session import get_db
from app.core.auth import get_current_user  # will be implemented later

router = APIRouter(
    prefix="/blocks",
    tags=["blocks"]
)

SessionDependency = Annotated[Session, Depends(get_db)]
UserDependency = Annotated[User, Depends(get_current_user)]


@router.post("/", response_model=BlockOut)
def create_new_block(block_in: BlockCreate, db: SessionDependency, current_user: UserDependency):
    space = get_space_by_id(db, block_in.space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    if space.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return create_block(db=db, block_in=block_in, space_id=block_in.space_id, owner_id=current_user.id)


@router.get("/{block_id}", response_model=BlockOut)
def read_block(block_id: int, db: SessionDependency, current_user: UserDependency):
    block = get_block_by_id(db, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    if block.space.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return block


@router.get("/space/{space_id}", response_model=list[BlockOut])
def read_blocks_for_space(space_id: int, db: SessionDependency, current_user: UserDependency):
    space = get_space_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    if space.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return get_blocks_in_space(db, space_id=space_id)


@router.put("/{block_id}", response_model=BlockOut)
def update_existing_block(block_id: int, block_in: BlockUpdate, db: SessionDependency, current_user: UserDependency):
    db_block = get_block_by_id(db, block_id)
    if not db_block:
        raise HTTPException(status_code=404, detail="Block not found")
    if db_block.space.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")


    updated_block = update_block(db, block_id, block_in)
    if not updated_block:
        raise HTTPException(status_code=404, detail="Block not found")
    return updated_block


@router.delete("/{block_id}")
def delete_existing_block(block_id: int, db: SessionDependency, current_user: UserDependency):
    db_block = get_block_by_id(db, block_id)
    if not db_block:
        raise HTTPException(status_code=404, detail="Block not found")
    if db_block.space.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    success = delete_block(db, block_id)  
    if not success:
        raise HTTPException(status_code=404, detail="Block not found")
    return {"detail": "Block deleted successfully"}


