from sqlalchemy import Boolean, Column, Integer, DateTime, ForeignKey, func, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import Base
import enum

class UserRole(enum.Enum):
    ADMIN = "admin"
    PARTICIPANT = "participant"
    VISITOR = "visitor"

class UserInSpace(Base):
    __tablename__ = "users_in_spaces"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    space_id = Column(Integer, ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_creator = Column(Boolean, default=False, nullable=False)
    joined_at = Column(DateTime(timezone=True), nullable=False, default=func.now())


    user = relationship("User", back_populates="memberships")
    space = relationship("Space", back_populates="memberships")
    
    __table_args__ = (UniqueConstraint('user_id', 'space_id', name='user_space_unique'),)