from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.models.block import Block
from app.schemas.block import BlockCreate, BlockUpdate
from app.core.permissions import has_permission, Permission
from fastapi import HTTPException
from typing import List


def create_block(db: Session, block_in: BlockCreate, owner_id: int, space_id: int):
    max_order = db.query(func.max(Block.order)).filter(Block.space_id == space_id).scalar()
    next_order = (max_order or 0) + 1
    
    db_block = Block(
        space_id=space_id,
        type=block_in.type,
        content=block_in.content,
        order=next_order,
        owner_id=owner_id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(db_block)
    db.commit()
    db.refresh(db_block)
    return db_block


def get_block_by_id(db: Session, block_id: int):
    return db.query(Block).filter(Block.id == block_id).first()


def get_blocks_in_space(db: Session, space_id: int):
    return db.query(Block).filter(Block.space_id == space_id).order_by(Block.order).all()


def update_block(db: Session, block_id: int, block_in: BlockUpdate):
    db_block = get_block_by_id(db, block_id)
    if not db_block:
        raise HTTPException(status_code=404, detail="Block not found")

    if block_in.type is not None:
        db_block.type = block_in.type
    if block_in.content is not None:
        db_block.content = block_in.content
        
    db_block.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_block)
    return db_block


def delete_block(db: Session, block_id: int):
    db_block = db.query(Block).filter(Block.id == block_id).first()
    if not db_block:
        return None

    db.delete(db_block)
    db.commit()
    return db_block