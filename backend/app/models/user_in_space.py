from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Boolean, Enum
from sqlalchemy.orm import relationship
from .base import Base
import enum

class UserRole(enum.Enum):
    ADMIN = "admin"
    PARTICIPANT = "participant"
    VISITOR = "visitor"   

class UserInSpace(Base):
    __tablename__ = "users_in_spaces"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    space_id = Column(Integer, ForeignKey("spaces.id", ondelete="CASCADE"), primary_key=True)
    is_creator = Column(Boolean, default=False)
    role = Column(Enum(UserRole), default=UserRole.PARTICIPANT)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="memberships")
    space = relationship("Space", back_populates="members")