from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import notifications
from app.core.security import get_current_user, TokenData
from app.models.notification import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _to_out(doc: dict) -> NotificationOut:
    return NotificationOut(id=str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"})


@router.get("/me", response_model=list[NotificationOut])
async def my_notifications(current: TokenData = Depends(get_current_user)):
    out = []
    async for doc in notifications.find({"user_id": current.user_id}).sort("created_at", -1):
        out.append(_to_out(doc))
    return out


@router.patch("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(notification_id: str, current: TokenData = Depends(get_current_user)):
    doc = await notifications.find_one({"_id": ObjectId(notification_id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if doc["user_id"] != current.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your notification")

    await notifications.update_one({"_id": ObjectId(notification_id)}, {"$set": {"read": True}})
    doc["read"] = True
    return _to_out(doc)
