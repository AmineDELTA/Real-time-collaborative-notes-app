from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base


class Space(Base):
    __tablename__ = "spaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Changed to owner_id
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())  # Add this since it exists

    # Relationships - keep these the same
    members = relationship("UserInSpace", back_populates="space")
    blocks = relationship("Block", back_populates="space")
    creator = relationship("User", back_populates="spaces_owned")