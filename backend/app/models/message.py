"""
In-app text message scoped to one accepted Interest. Text only — no
attachments, edits, deletion, or read receipts, and no real-time
transport; the frontend polls GET /interests/{id}/messages instead.
"""

from datetime import datetime, timezone
from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class MessageInDB(BaseModel):
    interest_id: str
    sender_id: str
    text: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MessageOut(BaseModel):
    id: str
    interest_id: str
    sender_id: str
    text: str
    created_at: datetime
