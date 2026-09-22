"""
GET /activity/me — a read-only, merged view built from three EXISTING
collections (notifications, interests, matches), not a new stored model.
Queried per-collection, combined in Python, sorted newest-first, and
capped.
"""

from bson import ObjectId
from fastapi import APIRouter, Depends

from app.core.database import notifications, interests, matches, client_profiles, supplier_profiles
from app.core.security import get_current_user, TokenData
from app.services.profiles import user_display_name

router = APIRouter(prefix="/activity", tags=["activity"])

ACTIVITY_LIMIT = 30


async def _own_profile_ids(collection, user_id: str) -> list[str]:
    return [str(d["_id"]) async for d in collection.find({"user_id": user_id})]


@router.get("/me")
async def my_activity(current: TokenData = Depends(get_current_user)):
    items = []

    async for n in notifications.find({"user_id": current.user_id}):
        items.append({"type": "notification", "message": n["message"], "timestamp": n["created_at"]})

    if current.role == "client":
        my_ids = await _own_profile_ids(client_profiles, current.user_id)
        interest_query = {"client_id": {"$in": my_ids}}
        match_query = {"client_id": {"$in": my_ids}}
        counterpart_collection = supplier_profiles
        counterpart_field = "supplier_id"
        counterpart_role = "supplier"
    elif current.role == "supplier":
        my_ids = await _own_profile_ids(supplier_profiles, current.user_id)
        interest_query = {"supplier_id": {"$in": my_ids}}
        match_query = {"supplier_id": {"$in": my_ids}}
        counterpart_collection = client_profiles
        counterpart_field = "client_id"
        counterpart_role = "client"
    else:
        my_ids = []

    if my_ids:
        async for i in interests.find(interest_query):
            counterpart_doc = await counterpart_collection.find_one({"_id": ObjectId(i[counterpart_field])})
            name = await user_display_name(counterpart_doc["user_id"], counterpart_role) if counterpart_doc else "Unknown"
            items.append({
                "type": "interest",
                "message": f"Interest with {name} is now {i['status']}",
                "timestamp": i["updated_at"],
            })

        async for m in matches.find(match_query):
            counterpart_doc = await counterpart_collection.find_one({"_id": ObjectId(m[counterpart_field])})
            name = await user_display_name(counterpart_doc["user_id"], counterpart_role) if counterpart_doc else "Unknown"
            items.append({
                "type": "match",
                "message": f"New match with {name} scored {m['score_total']}%",
                "timestamp": m["created_at"],
            })

    items.sort(key=lambda x: x["timestamp"], reverse=True)
    return items[:ACTIVITY_LIMIT]
