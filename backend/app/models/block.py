import enum
from sqlalchemy import Column, Enum, Integer, String, DateTime, ForeignKey, Text, func
from .base import Base
from sqlalchemy.orm import relationship

class BlockType(enum.Enum):
    TEXT = "TEXT"
    HEADING = "HEADING"
    BULLET_LIST = "BULLET_LIST"
    NUMBERED_LIST = "NUMBERED_LIST"

class Block(Base):
    __tablename__ = "blocks"

    id = Column(Integer, primary_key=True, index=True)
    space_id = Column(Integer, ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False)
    type = Column(Enum(BlockType), nullable=False)
    content = Column(Text, nullable=True)
    order = Column(Integer, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now())
    
    # Relationships
    space = relationship("Space", back_populates="blocks")
    owner = relationship("User", back_populates="blocks")