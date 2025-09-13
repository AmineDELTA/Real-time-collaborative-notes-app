from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone
from app.models.user_in_space import UserInSpace, UserRole
from app.models.user import User
from app.schemas.user_in_space import UserInSpaceCreate, UserInSpaceUpdate
from fastapi import HTTPException

def add_user_to_space(db: Session, user_in_space_in: UserInSpaceCreate):
    existing = db.query(UserInSpace).filter(
        UserInSpace.user_id == user_in_space_in.user_id,
        UserInSpace.space_id == user_in_space_in.space_id
    ).first()
    
    if existing:
        return existing
    
    if isinstance(user_in_space_in.role, str):
        role_enum = UserRole(user_in_space_in.role)
    else:
        role_enum = user_in_space_in.role
        
    db_membership = UserInSpace(
        user_id=user_in_space_in.user_id,
        space_id=user_in_space_in.space_id,
        role=role_enum,
        is_creator=False,
        joined_at=datetime.now(timezone.utc)
    )
    db.add(db_membership)
    db.commit()
    db.refresh(db_membership)
    return db_membership


def get_users_in_space(db: Session, space_id: int):
    return db.query(UserInSpace).filter(UserInSpace.space_id == space_id).all()

def get_users_in_space_with_details(db: Session, space_id: int):
    """Get all users in a space with their user details"""
    return db.query(UserInSpace).options(
        joinedload(UserInSpace.user)
    ).filter(UserInSpace.space_id == space_id).all()


def remove_user_from_space(db: Session, user_id: int, space_id: int):
    membership = db.query(UserInSpace).filter(
        UserInSpace.user_id == user_id,
        UserInSpace.space_id == space_id
    ).first()
    if membership:
        db.delete(membership)
        db.commit()
    return membership


def update_user_role(db: Session, space_id: int, user_id: int, updates: UserInSpaceUpdate):
    """Update user role and permissions in a space"""
    user_in_space = db.query(UserInSpace).filter(
        UserInSpace.space_id == space_id,
        UserInSpace.user_id == user_id
    ).first()
    
    if not user_in_space:
        return None
    
    # Update role if provided
    if updates.role is not None:
        user_in_space.role = updates.role
    
    # Update creator status if provided (be careful with this!)
    if updates.is_creator is not None:
        user_in_space.is_creator = updates.is_creator
    
    db.commit()
    db.refresh(user_in_space)
    return user_in_space

def check_user_permission(db: Session, user_id: int, space_id: int, required_role: UserRole = UserRole.VISITOR):
    """Check if user has sufficient permissions in a space"""
    membership = db.query(UserInSpace).filter(
        UserInSpace.user_id == user_id,
        UserInSpace.space_id == space_id
    ).first()
    
    if not membership:
        return False
    
    if membership.is_creator or membership.role == UserRole.ADMIN:
        return True
    
    # Check role hierarchy: ADMIN > PARTICIPANT > VISITOR
    role_hierarchy = {
        UserRole.VISITOR: 1,      # Changed from VIEWER
        UserRole.PARTICIPANT: 2,  # Changed from EDITOR
        UserRole.ADMIN: 3
    }
    
    user_level = role_hierarchy.get(membership.role, 0)
    required_level = role_hierarchy.get(required_role, 0)
    
    return user_level >= required_level