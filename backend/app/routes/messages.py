"""
Text messaging scoped to one accepted Interest — the two parties on that
Interest only, and only once it's accepted (not proposed or declined).
"""

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import interests, messages as messages_col, notifications, client_profiles, supplier_profiles
from app.core.security import get_current_user, TokenData
from app.models.interest import InterestStatus
from app.models.message import MessageCreate, MessageInDB, MessageOut
from app.models.notification import NotificationInDB
from app.services.profiles import client_display_name, supplier_display_name

router = APIRouter(prefix="/interests", tags=["messages"])


async def _authorize(interest_id: str, current: TokenData) -> dict:
    interest_doc = await interests.find_one({"_id": ObjectId(interest_id)})
    if not interest_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interest not found")
    if interest_doc["status"] != InterestStatus.accepted.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Messaging is only available once an interest has been accepted",
        )

    client_doc = await client_profiles.find_one({"_id": ObjectId(interest_doc["client_id"])})
    supplier_doc = await supplier_profiles.find_one({"_id": ObjectId(interest_doc["supplier_id"])})
    party_user_ids = set()
    if client_doc:
        party_user_ids.add(client_doc["user_id"])
    if supplier_doc:
        party_user_ids.add(supplier_doc["user_id"])
    if current.user_id not in party_user_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a party to this interest")

    return {"interest": interest_doc, "client": client_doc, "supplier": supplier_doc}


def _to_out(doc: dict) -> MessageOut:
    return MessageOut(id=str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"})


@router.post("/{interest_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(interest_id: str, payload: MessageCreate, current: TokenData = Depends(get_current_user)):
    ctx = await _authorize(interest_id, current)
    doc = MessageInDB(interest_id=interest_id, sender_id=current.user_id, text=payload.text).model_dump()
    result = await messages_col.insert_one(doc)
    doc["_id"] = result.inserted_id

    client_doc, supplier_doc = ctx["client"], ctx["supplier"]
    is_client_sender = current.user_id == client_doc["user_id"]
    other_user_id = supplier_doc["user_id"] if is_client_sender else client_doc["user_id"]
    sender_name = (
        await client_display_name(client_doc) if is_client_sender else await supplier_display_name(supplier_doc)
    )
    await notifications.insert_one(NotificationInDB(
        user_id=other_user_id,
        match_id=interest_id,
        message=f'New message from {sender_name}: "{payload.text[:60]}"',
    ).model_dump())

    return _to_out(doc)


@router.get("/{interest_id}/messages", response_model=list[MessageOut])
async def list_messages(interest_id: str, current: TokenData = Depends(get_current_user)):
    await _authorize(interest_id, current)
    out = []
    async for doc in messages_col.find({"interest_id": interest_id}).sort("created_at", 1):
        out.append(_to_out(doc))
    return out
