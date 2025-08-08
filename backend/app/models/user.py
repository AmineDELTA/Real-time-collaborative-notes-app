from sqlalchemy import Column, Integer, String, DateTime, func
from .base import Base
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False, unique=True)
    email = Column(String(255), nullable=False, unique=True)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    

    spaces_owned = relationship("Space", back_populates="owner",cascade="all, delete-orphan")
    memberships = relationship("UserInSpace", back_populates="user", cascade="all, delete-orphan")
    blocks = relationship("Block", back_populates="owner", cascade="all, delete-orphan") 