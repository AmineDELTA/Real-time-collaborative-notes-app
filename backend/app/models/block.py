from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from .base import Base
from sqlalchemy.orm import relationship


class Block(Base):
    __tablename__ = "blocks"

    id = Column(Integer, primary_key=True, index=True)
    space_id = Column(Integer, ForeignKey("spaces.id"), nullable=False)
    type = Column(String, nullable=False)
    content = Column(String, nullable=False)
    order = Column(Integer, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, default=func.now(), onupdate=func.now())
    # Relationships
    space = relationship("Space", back_populates="blocks")
    owner = relationship("User", back_populates="blocks")