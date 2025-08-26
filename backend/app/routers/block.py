from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Annotated
from app.models.user import User
from app.schemas.block import BlockCreate, BlockOut, BlockUpdate
from app.services.block import (create_block, get_block_by_id, update_block, delete_block, get_blocks_in_space)
from app.services.space import get_space_by_id
from app.db.session import get_db
from app.core.auth import get_current_user
from app.core.permissions import Permission, has_permission
from app.models.user_in_space import UserInSpace
from app.models.block import Block

router = APIRouter(
    prefix="/blocks",
    tags=["blocks"]
)

SessionDependency = Annotated[Session, Depends(get_db)]
UserDependency = Annotated[User, Depends(get_current_user)]


#functions to reduce repetition
def get_space_membership(space_id: int, current_user: User, db: Session):
    membership = db.query(UserInSpace).filter(UserInSpace.user_id == current_user.id,UserInSpace.space_id == space_id).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this space")
    
    return membership

def get_block_membership(block_id: int, current_user: User, db: Session):
    block = get_block_by_id(db, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    membership = get_space_membership(block.space_id, current_user, db)
    return block, membership

def check_permission(membership, permission: Permission):
    if not has_permission(membership.role, permission, membership.is_creator):
        raise HTTPException(status_code=403, detail="Insufficient permissions")



@router.post("/", response_model=BlockOut)
def create_new_block(block_in: BlockCreate, db: SessionDependency, current_user: UserDependency):
    space = get_space_by_id(db, block_in.space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    
    membership = get_space_membership(block_in.space_id, current_user, db)
    check_permission(membership, Permission.CREATE_BLOCKS)
    
    max_order = db.query(func.max(Block.order)).filter(Block.space_id == block_in.space_id).scalar() or 0
    
    db_block = Block(
        space_id=block_in.space_id,
        content=block_in.content,
        type=block_in.type,
        order=max_order + 1,  # Auto-increment
        owner_id=current_user.id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    ) 
    db.add(db_block)
    db.commit()
    db.refresh(db_block)
    
    return db_block


@router.get("/{block_id}", response_model=BlockOut)
def read_block(block_id: int, db: SessionDependency, current_user: UserDependency):
    block, membership = get_block_membership(block_id, current_user, db)
    check_permission(membership, Permission.VIEW_BLOCKS)
    return block


@router.get("/space/{space_id}", response_model=list[BlockOut])
def read_blocks_for_space(space_id: int, db: SessionDependency, current_user: UserDependency):
    membership = get_space_membership(space_id, current_user, db)
    check_permission(membership, Permission.VIEW_BLOCKS)
    return get_blocks_in_space(db, space_id=space_id)


@router.put("/{block_id}", response_model=BlockOut)
def update_existing_block(block_id: int, block_in: BlockUpdate, db: SessionDependency, current_user: UserDependency):
    block, membership = get_block_membership(block_id, current_user, db)
    check_permission(membership, Permission.EDIT_BLOCKS)

    updated_block = update_block(db, block_id, block_in)
    if not updated_block:
        raise HTTPException(status_code=404, detail="Block not found")
    return updated_block


@router.delete("/{block_id}")
def delete_existing_block(block_id: int, db: SessionDependency, current_user: UserDependency):
    block, membership = get_block_membership(block_id, current_user, db)
    check_permission(membership, Permission.DELETE_BLOCKS)

    success = delete_block(db, block_id)  
    if not success:
        raise HTTPException(status_code=404, detail="Block not found")
    return {"detail": "Block deleted successfully"}


@router.put("/space/{space_id}/reorder")
def reorder_blocks(
    space_id: int,
    block_orders: dict,
    db: SessionDependency, 
    current_user: UserDependency
):
    membership = get_space_membership(space_id, current_user, db)
    check_permission(membership, Permission.REORDER_BLOCKS)
    
    # Update block orders :)
    for block_id, new_order in block_orders.items():
        block = get_block_by_id(db, int(block_id))
        if block and block.space_id == space_id:
            block.order = new_order
            block.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    return {"detail": "Blocks reordered successfully"}