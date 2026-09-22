"""
Company/supplier display names live on the owning User document (see
models/user.py), not on the Client/Supplier listing itself. These helpers
resolve that name consistently everywhere a listing needs to show it,
and batch-resolve it for listing pages where fetching one user per row
would be wasteful.
"""

from bson import ObjectId

from app.core.database import users


async def user_display_name(user_id: str, role: str) -> str | None:
    user_doc = await users.find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        return None
    return user_doc.get("company_name") if role == "client" else user_doc.get("supplier_name")


async def client_display_name(client_doc: dict | None) -> str | None:
    if not client_doc:
        return None
    return await user_display_name(client_doc["user_id"], "client")


async def supplier_display_name(supplier_doc: dict | None) -> str | None:
    if not supplier_doc:
        return None
    return await user_display_name(supplier_doc["user_id"], "supplier")


async def batch_display_names(user_ids: list[str], role: str) -> dict[str, str]:
    """user_id (str) -> display name, for every id in user_ids that resolves."""
    if not user_ids:
        return {}
    field = "company_name" if role == "client" else "supplier_name"
    out = {}
    cursor = users.find({"_id": {"$in": [ObjectId(uid) for uid in set(user_ids)]}})
    async for doc in cursor:
        out[str(doc["_id"])] = doc.get(field)
    return out
