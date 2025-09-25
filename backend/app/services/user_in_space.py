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
    return db.query(UserInSpace).options(
        joinedload(UserInSpace.user)
    ).filter(UserInSpace.space_id == space_id).all()


def remove_user_from_space(db: Session, space_id: int, user_id: int):
    """Remove a user from a space.
    
    Parameters:
    - db: Database session
    - space_id: ID of the space
    - user_id: ID of the user to remove
    
    Returns the removed membership or None if not found.
    """
    try:
        print(f"Removing user {user_id} from space {space_id}")
        membership = db.query(UserInSpace).filter(
            UserInSpace.user_id == user_id,
            UserInSpace.space_id == space_id
        ).first()
        
        if membership:
            print(f"Found membership: {membership.user_id} in space {membership.space_id}")
            db.delete(membership)
            db.commit()
            return membership
        else:
            print(f"No membership found for user {user_id} in space {space_id}")
            return None
    except Exception as e:
        print(f"Error removing user from space: {str(e)}")
        db.rollback()
        raise


def update_user_role(db: Session, space_id: int, user_id: int, updates: UserInSpaceUpdate):
    user_in_space = db.query(UserInSpace).filter(
        UserInSpace.space_id == space_id,
        UserInSpace.user_id == user_id
    ).first()
    
    if not user_in_space:
        return None
    
    # Update role if provided
    if updates.role is not None:
        user_in_space.role = updates.role
    
    if updates.is_creator is not None:
        user_in_space.is_creator = updates.is_creator
    
    db.commit()
    db.refresh(user_in_space)
    return user_in_space

def check_user_permission(db: Session, user_id: int, space_id: int, required_role: UserRole = UserRole.VISITOR):
    membership = db.query(UserInSpace).filter(
        UserInSpace.user_id == user_id,
        UserInSpace.space_id == space_id
    ).first()
    
    if not membership:
        return False
    
    if membership.is_creator or membership.role == UserRole.ADMIN:
        return True

    role_hierarchy = {
        UserRole.VISITOR: 1,
        UserRole.PARTICIPANT: 2,
        UserRole.ADMIN: 3
    }
    
    user_level = role_hierarchy.get(membership.role, 0)
    required_level = role_hierarchy.get(required_role, 0)
    
    return user_level >= required_level