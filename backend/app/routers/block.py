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
    
    max_order = db.query(func.max(Block.order)).filter(Block.space_id == block_in.space_id).scalar()
    if max_order is None:
        new_order = 0
    else:
        new_order = max_order + 1

    db_block = Block(
        space_id=block_in.space_id,
        content=block_in.content,
        type=block_in.type,
        order=new_order,  # Start from 0
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

    space_id = block.space_id  # Save before delete
    success = delete_block(db, block_id)  
    if not success:
        raise HTTPException(status_code=404, detail="Block not found")

    # 🟢 Re-sequence orders for remaining blocks in the space
    remaining_blocks = db.query(Block).filter(Block.space_id == space_id).order_by(Block.order).all()
    for idx, b in enumerate(remaining_blocks):
        b.order = idx
    db.commit()

    return {"detail": "Block deleted and order re-sequenced successfully"}


@router.post("/space/{space_id}/refresh-order")
def refresh_block_order(space_id: int, db: SessionDependency, current_user: UserDependency):
    membership = get_space_membership(space_id, current_user, db)
    check_permission(membership, Permission.REORDER_BLOCKS)

    blocks = db.query(Block).filter(Block.space_id == space_id).order_by(Block.order).all()
    for idx, block in enumerate(blocks):
        block.order = idx
    db.commit()
    return {"detail": "Block order refreshed"}