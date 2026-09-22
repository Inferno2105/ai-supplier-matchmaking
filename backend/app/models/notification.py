"""
In-app notification model. No SMTP/WebSocket — notifications are DB
records surfaced via GET /notifications/me.
"""

from datetime import datetime, timezone
from pydantic import BaseModel, Field


class NotificationInDB(BaseModel):
    user_id: str
    match_id: str
    message: str
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NotificationOut(BaseModel):
    id: str
    user_id: str
    match_id: str
    message: str
    read: bool
    created_at: datetime
