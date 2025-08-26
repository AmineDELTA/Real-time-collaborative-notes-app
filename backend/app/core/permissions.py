from enum import Enum
from app.models.user_in_space import UserRole

class Permission(Enum):
    
    VIEW_SPACE = "view_space"
    EDIT_SPACE_SETTINGS = "edit_space_settings"
    DELETE_SPACE = "delete_space"
    MANAGE_MEMBERS = "manage_members"
    
    VIEW_BLOCKS = "view_blocks"
    CREATE_BLOCKS = "create_blocks"
    EDIT_BLOCKS = "edit_blocks"
    DELETE_BLOCKS = "delete_blocks"
    REORDER_BLOCKS = "reorder_blocks"
    

ROLE_PERMISSIONS = {
    UserRole.ADMIN: {
        # Space permissions
        Permission.VIEW_SPACE,
        Permission.EDIT_SPACE_SETTINGS,
        Permission.DELETE_SPACE,  # Only if creator
        Permission.MANAGE_MEMBERS,
        
        # Block permissions 
        Permission.VIEW_BLOCKS,
        Permission.CREATE_BLOCKS,
        Permission.EDIT_BLOCKS,
        Permission.DELETE_BLOCKS,
        Permission.REORDER_BLOCKS,
    },
    
    UserRole.PARTICIPANT: {
        # Space permissions
        Permission.VIEW_SPACE,
        
        # Block permissions
        Permission.VIEW_BLOCKS,
        Permission.CREATE_BLOCKS,
        Permission.EDIT_BLOCKS,
        Permission.DELETE_BLOCKS,
        Permission.REORDER_BLOCKS,
    },
    
    UserRole.VISITOR: {
        # Space permissions
        Permission.VIEW_SPACE,
        
        # Block permissions
        Permission.VIEW_BLOCKS,
    }
}


def has_permission(user_role: UserRole, permission: Permission, is_creator: bool = False):
    role_perms = ROLE_PERMISSIONS.get(user_role, set())
    
    if permission == Permission.DELETE_SPACE and is_creator:
        return True
        
    return permission in role_perms