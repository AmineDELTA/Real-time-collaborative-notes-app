# Create: app/core/websocket_manager.py
import asyncio
from fastapi import WebSocket
from typing import Dict, List, Set
import json
from datetime import datetime

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        self.connection_users: Dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, space_id: int, user_id: int, username: str):
        await websocket.accept()

        if space_id not in self.active_connections:
            self.active_connections[space_id] = set()
        self.active_connections[space_id].add(websocket)
        
        # Store user info
        self.connection_users[websocket] = {
            "user_id": user_id,
            "username": username,
            "space_id": space_id,
            "connected_at": datetime.now()
        }
        
        # Notify others that user joined
        await self.broadcast_to_space(space_id, {
            "type": "user_joined",
            "user_id": user_id,
            "username": username,
            "timestamp": datetime.now().isoformat()
        }, exclude_websocket=websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.connection_users:
            user_info = self.connection_users[websocket]
            space_id = user_info["space_id"]
            
            # Remove from connections
            if space_id in self.active_connections:
                self.active_connections[space_id].discard(websocket)
                if not self.active_connections[space_id]:
                    del self.active_connections[space_id]
            
            # Notify others that user left
            asyncio.create_task(self.broadcast_to_space(space_id, {
                "type": "user_left",
                "user_id": user_info["user_id"],
                "username": user_info["username"],
                "timestamp": datetime.now().isoformat()
            }))
            
            del self.connection_users[websocket]

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        
        try:
            await websocket.send_text(json.dumps(message))
        except Exception:
            self.disconnect(websocket)

    async def broadcast_to_space(self, space_id: int, message: dict, exclude_websocket: WebSocket = None):
        if space_id not in self.active_connections:
            return
        
        message_str = json.dumps(message)
        disconnected = []
        
        for websocket in self.active_connections[space_id].copy():
            if websocket != exclude_websocket:
                try:
                    await websocket.send_text(message_str)
                except Exception:
                    disconnected.append(websocket)
        
        # Clean up disconnected websockets
        for websocket in disconnected:
            self.disconnect(websocket)

    def get_space_users(self, space_id: int) -> List[dict]:
        if space_id not in self.active_connections:
            return []
        
        users = []
        for websocket in self.active_connections[space_id]:
            if websocket in self.connection_users:
                user_info = self.connection_users[websocket]
                users.append({
                    "user_id": user_info["user_id"],
                    "username": user_info["username"],
                    "connected_at": user_info["connected_at"].isoformat()
                })
        return users

# Global connection manager instance
manager = ConnectionManager()