from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from .base import Base


class UserInSpace(Base):
    __tablename__ = "users_in_spaces"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    space_id = Column(Integer, ForeignKey("spaces.id"), nullable=False)
    role = Column(String, nullable=False)
    joined_at = Column(DateTime(timezone=True), nullable=False, default=func.now())


    user = relationship("User", back_populates="memberships")
    space = relationship("Space", back_populates="memberships")