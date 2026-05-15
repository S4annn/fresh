"""
WebSocket connection manager for real-time notifications.
"""
from typing import Dict, List
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections per user_id."""
    
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected: {user_id} (total: {len(self.active_connections[user_id])})")
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id] = [
                ws for ws in self.active_connections[user_id] if ws != websocket
            ]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WebSocket disconnected: {user_id}")
    
    async def send_notification(self, user_id: str, notification: dict):
        """Send notification to all connections of a specific user."""
        if user_id not in self.active_connections:
            return
        
        message = json.dumps(notification, ensure_ascii=False, default=str)
        disconnected = []
        
        for ws in self.active_connections[user_id]:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.append(ws)
        
        # Clean up dead connections
        for ws in disconnected:
            self.disconnect(ws, user_id)
    
    async def broadcast(self, notification: dict):
        """Send to all connected users."""
        message = json.dumps(notification, ensure_ascii=False, default=str)
        for user_id, connections in list(self.active_connections.items()):
            for ws in connections:
                try:
                    await ws.send_text(message)
                except Exception:
                    self.disconnect(ws, user_id)


# Global instance
manager = ConnectionManager()
