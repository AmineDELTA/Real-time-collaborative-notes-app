from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from .base import Base
from sqlalchemy.orm import relationship


class Space(Base):
    __tablename__="spaces"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, default=func.now(), onupdate=func.now())
    

    owner = relationship("User", back_populates="spaces_owned")
    blocks = relationship("Block", back_populates="space", cascade="all, delete-orphan")
    memberships = relationship("UserInSpace", back_populates="space", cascade="all, delete-orphan")