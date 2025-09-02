from fastapi import WebSocket, APIRouter, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.core.websocket_manager import manager
from app.core.auth import get_current_user_websocket
from app.db.session import get_db
from app.models.user_in_space import UserInSpace
from app.core.permissions import has_permission, Permission
from app.services.block import update_block
from app.schemas.block import BlockUpdate
import json
from datetime import datetime

router = APIRouter()

@router.websocket("/ws/space/{space_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    space_id: int,
    token: str,
    db: Session = Depends(get_db)
):
    try:
        # Authenticate user
        current_user = await get_current_user_websocket(token, db)
        if not current_user:
            await websocket.close(code=4001, reason="Authentication failed")
            return
        
        # Check space membership
        membership = db.query(UserInSpace).filter(
            UserInSpace.user_id == current_user.id,
            UserInSpace.space_id == space_id
        ).first()
        
        if not membership:
            await websocket.close(code=4003, reason="Not a member of this space")
            return
        
        # Connect user to space
        await manager.connect(websocket, space_id, current_user.id, current_user.username)
        
        # Send initial data
        await manager.send_personal_message({
            "type": "connection_established",
            "space_id": space_id,
            "user_id": current_user.id,
            "role": membership.role.value,
            "active_users": manager.get_space_users(space_id)
        }, websocket)
        
        # Handle incoming messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            await handle_websocket_message(message, websocket, current_user, membership, space_id, db)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

async def handle_websocket_message(message: dict, websocket: WebSocket, current_user, membership, space_id: int, db: Session):
    message_type = message.get("type")
    
    if message_type == "block_update":
        await handle_block_update(message, websocket, current_user, membership, space_id, db)
    
    elif message_type == "cursor_position":
        await handle_cursor_position(message, websocket, current_user, space_id)
    
    elif message_type == "user_typing":
        await handle_user_typing(message, websocket, current_user, space_id)
    
    elif message_type == "block_selection":
        await handle_block_selection(message, websocket, current_user, space_id)

async def handle_block_update(message: dict, websocket: WebSocket, current_user, membership, space_id: int, db: Session):
    try:
        block_id = message.get("block_id")
        new_content = message.get("content")
        
        if not block_id or new_content is None:
            return
        
        if not has_permission(membership.role, Permission.EDIT_BLOCKS, membership.is_creator):
            await manager.send_personal_message({
                "type": "error",
                "message": "Insufficient permissions to edit blocks"
            }, websocket)
            return
        
        # Update block in database
        block_update = BlockUpdate(content=new_content)
        updated_block = update_block(db, block_id, block_update)
        
        if updated_block:
            # Broadcast to all users in space (except sender)
            await manager.broadcast_to_space(space_id, {
                "type": "block_updated",
                "block_id": block_id,
                "content": new_content,
                "updated_by": current_user.id,
                "updated_by_username": current_user.username,
                "timestamp": datetime.now().isoformat()
            }, exclude_websocket=websocket)
        
    except Exception as e:
        await manager.send_personal_message({
            "type": "error",
            "message": f"Failed to update block: {str(e)}"
        }, websocket)

async def handle_cursor_position(message: dict, websocket: WebSocket, current_user, space_id: int):
    block_id = message.get("block_id")
    position = message.get("position")
    
    if block_id is not None and position is not None:
        await manager.broadcast_to_space(space_id, {
            "type": "cursor_position",
            "block_id": block_id,
            "position": position,
            "user_id": current_user.id,
            "username": current_user.username
        }, exclude_websocket=websocket)

async def handle_user_typing(message: dict, websocket: WebSocket, current_user, space_id: int):
    block_id = message.get("block_id")
    is_typing = message.get("is_typing", False)
    
    if block_id is not None:
        await manager.broadcast_to_space(space_id, {
            "type": "user_typing",
            "block_id": block_id,
            "is_typing": is_typing,
            "user_id": current_user.id,
            "username": current_user.username
        }, exclude_websocket=websocket)

async def handle_block_selection(message: dict, websocket: WebSocket, current_user, space_id: int):
    block_id = message.get("block_id")
    
    if block_id is not None:
        await manager.broadcast_to_space(space_id, {
            "type": "block_selection",
            "block_id": block_id,
            "user_id": current_user.id,
            "username": current_user.username
        }, exclude_websocket=websocket)