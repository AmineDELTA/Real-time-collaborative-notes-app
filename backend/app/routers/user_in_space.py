from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import Annotated, List
from app.models.user import User
from app.models.user_in_space import UserRole, UserInSpace
from app.schemas.user_in_space import UserInSpaceCreate, UserInSpaceOut, UserInSpaceUpdate
from app.services.user_in_space import (
    add_user_to_space, get_users_in_space_with_details, remove_user_from_space, 
    update_user_role as service_update_user_role, check_user_permission
)
from app.services.space import get_space_by_id
from app.services.user import get_user_by_email
from app.db.session import get_db
from app.core.auth import get_current_user

router = APIRouter(tags=["user-in-space"])

SessionDependency = Annotated[Session, Depends(get_db)]
UserDependency = Annotated[User, Depends(get_current_user)]

def check_admin_permission(current_user: User, space_id: int, db: Session):
    space = get_space_by_id(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    
    if space.owner_id == current_user.id:
        return space
    
    # Check if user is admin in this space
    if not check_user_permission(db, current_user.id, space_id, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return space

@router.get("/space/{space_id}/users", response_model=List[UserInSpaceOut])
def get_space_members(space_id: int, db: SessionDependency, current_user: UserDependency):
    # Check if user can view space members
    if not check_user_permission(db, current_user.id, space_id, UserRole.VISITOR):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get members with user details loaded
    members = db.query(UserInSpace).options(
        joinedload(UserInSpace.user)
    ).filter(UserInSpace.space_id == space_id).all()
    
    # Format response with user details
    result = []
    for member in members:
        result.append(UserInSpaceOut(
            user_id=member.user_id,
            space_id=member.space_id,
            role=member.role,
            is_creator=member.is_creator,
            joined_at=member.joined_at,
            username=member.user.username if member.user else None,
            email=member.user.email if member.user else None
        ))
    
    return result

@router.put("/space/{space_id}/user/{user_id}/role", response_model=UserInSpaceOut)
def change_user_role(
    space_id: int, 
    user_id: int, 
    role_update: UserInSpaceUpdate, 
    db: SessionDependency, 
    current_user: UserDependency
):
    # Check admin permissions
    space = check_admin_permission(current_user, space_id, db)
    
    if user_id == current_user.id and current_user.id == space.owner_id:
        if role_update.is_creator is False:
            raise HTTPException(status_code=400, detail="Space creator cannot remove their own creator status")
    
    updated_membership = service_update_user_role(db, space_id, user_id, role_update)
    
    if not updated_membership:
        raise HTTPException(status_code=404, detail="User not found in space")
    
    # Reload with user details - FIXED TO USE COMPOSITE KEY
    updated_membership = db.query(UserInSpace).options(
        joinedload(UserInSpace.user)
    ).filter(
        UserInSpace.user_id == user_id,
        UserInSpace.space_id == space_id
    ).first()
    
    return UserInSpaceOut(
        user_id=updated_membership.user_id,
        space_id=updated_membership.space_id,
        role=updated_membership.role,
        is_creator=updated_membership.is_creator,
        joined_at=updated_membership.joined_at,
        username=updated_membership.user.username if updated_membership.user else None,
        email=updated_membership.user.email if updated_membership.user else None
    )

@router.post("/space/{space_id}/invite", response_model=UserInSpaceOut)
def invite_user_to_space(
    space_id: int,
    user_email: str,
    db: SessionDependency,
    current_user: UserDependency,
    role: UserRole = UserRole.PARTICIPANT
):
    # Check admin permissions
    check_admin_permission(current_user, space_id, db)
    
    # Find user by email
    invited_user = get_user_by_email(db, user_email)
    if not invited_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is already in space
    existing = db.query(UserInSpace).filter(
        UserInSpace.user_id == invited_user.id,
        UserInSpace.space_id == space_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User already in space")
    
    # Add user to space
    user_in_space_data = UserInSpaceCreate(
        user_id=invited_user.id,
        space_id=space_id
    )
    
    new_membership = add_user_to_space(db, user_in_space_data)
    
    # Set the role
    if role != UserRole.PARTICIPANT:
        update_data = UserInSpaceUpdate(role=role)
        new_membership = service_update_user_role(db, space_id, invited_user.id, update_data)
    
    # Reload with user details - FIXED TO USE COMPOSITE KEY
    new_membership = db.query(UserInSpace).options(
        joinedload(UserInSpace.user)
    ).filter(
        UserInSpace.user_id == invited_user.id,
        UserInSpace.space_id == space_id
    ).first()
    
    return UserInSpaceOut(
        user_id=new_membership.user_id,
        space_id=new_membership.space_id,
        role=new_membership.role,
        is_creator=new_membership.is_creator,
        joined_at=new_membership.joined_at,
        username=new_membership.user.username if new_membership.user else None,
        email=new_membership.user.email if new_membership.user else None
    )

@router.delete("/space/{space_id}/user/{user_id}")
def remove_user_from_space_endpoint(
    space_id: int, 
    user_id: int, 
    db: SessionDependency, 
    current_user: UserDependency
):
    from app.services.space import delete_space
    
    try:
        print(f"REMOVE REQUEST: User {current_user.id} trying to remove user {user_id} from space {space_id}")
        
        space = get_space_by_id(db, space_id)
        if not space:
            raise HTTPException(status_code=404, detail="Space not found")
            
        is_owner = user_id == space.owner_id
        is_self_action = current_user.id == user_id
        
        print(f"Space owner: {space.owner_id}, Is user the owner: {is_owner}, Is self action: {is_self_action}")
        
        # Case 1: User is trying to leave and is the owner
        if is_self_action and is_owner:
            print(f"Owner {user_id} is leaving space {space_id}, deleting space")
            # Delete the space when the owner leaves
            delete_space(db, space_id)
            return {"detail": "You have left the space and it has been deleted since you were the owner"}
        
        # Case 2: User is trying to leave and is not the owner
        elif is_self_action:
            print(f"User {user_id} is leaving space {space_id}")
            remove_user_from_space(db, space_id, user_id)
            return {"detail": "You have left the space successfully"}
        
        # Case 3: Admin is trying to remove someone else
        else:
            print(f"User {current_user.id} is trying to remove user {user_id} from space {space_id}")
            # Check admin permissions
            try:
                space = check_admin_permission(current_user, space_id, db)
            except Exception as e:
                print(f"Permission check failed: {str(e)}")
                raise HTTPException(status_code=403, detail="You don't have permission to remove users from this space")
            
            # Don't allow admins to remove the space owner
            if is_owner:
                raise HTTPException(status_code=400, detail="Cannot remove space owner")
            
            # Remove the user
            remove_user_from_space(db, space_id, user_id)
            return {"detail": "User removed from space successfully"}
    except Exception as e:
        print(f"Error in remove_user_from_space_endpoint: {str(e)}")
        raise


@router.put("/{membership_id}/role", response_model=UserInSpaceOut)
def update_user_role(
    membership_id: int,
    role_update: UserInSpaceUpdate,
    db: SessionDependency,
    current_user: UserDependency
):
    # THIS ENDPOINT IS OBSOLETE - USE /space/{space_id}/user/{user_id}/role INSTEAD
    
    # This endpoint cannot work since UserInSpace doesn't have an id field
    # We'll return a clear error message
    raise HTTPException(
        status_code=400, 
        detail="This endpoint is deprecated. Please use /space/{space_id}/user/{user_id}/role instead"
    )
