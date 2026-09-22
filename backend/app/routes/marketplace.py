"""
Client-facing and supplier-facing marketplace browsing — every listing on
the other side, not just same-category Match results, with optional
category/state/search filters and an already_interested flag per item.
"""

import re
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.database import client_profiles, supplier_profiles, interests
from app.core.security import require_role, TokenData
from app.models.marketplace import MarketplaceSupplierOut, MarketplaceClientOut
from app.models.interest import InterestStatus

router = APIRouter(prefix="/marketplace", tags=["marketplace"])


async def _own_profile_ids(collection, user_id: str) -> list[str]:
    return [str(d["_id"]) async for d in collection.find({"user_id": user_id})]


def _search_filter(search: Optional[str], fields: list[str]) -> Optional[dict]:
    """Case-insensitive substring match across the given fields (OR'd)."""
    if not search:
        return None
    pattern = re.escape(search.strip())
    if not pattern:
        return None
    return {"$or": [{f: {"$regex": pattern, "$options": "i"}} for f in fields]}


@router.get("/suppliers", response_model=list[MarketplaceSupplierOut])
async def browse_suppliers(
    category: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current: TokenData = Depends(require_role("client")),
):
    my_client_ids = await _own_profile_ids(client_profiles, current.user_id)
    interested_supplier_ids = set()
    if my_client_ids:
        cursor = interests.find({
            "client_id": {"$in": my_client_ids},
            "status": {"$ne": InterestStatus.declined.value},
        })
        async for i in cursor:
            interested_supplier_ids.add(i["supplier_id"])

    query = {}
    if category:
        query["category"] = category
    if state:
        query["state"] = state
    search_filter = _search_filter(search, ["supplier_name", "product_offered"])
    if search_filter:
        query.update(search_filter)

    out = []
    async for doc in supplier_profiles.find(query):
        supplier_id = str(doc["_id"])
        out.append(MarketplaceSupplierOut(
            id=supplier_id,
            already_interested=supplier_id in interested_supplier_ids,
            **{k: v for k, v in doc.items() if k != "_id"},
        ))
    return out


@router.get("/clients", response_model=list[MarketplaceClientOut])
async def browse_clients(
    category: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current: TokenData = Depends(require_role("supplier")),
):
    my_supplier_ids = await _own_profile_ids(supplier_profiles, current.user_id)
    interested_client_ids = set()
    if my_supplier_ids:
        cursor = interests.find({
            "supplier_id": {"$in": my_supplier_ids},
            "status": {"$ne": InterestStatus.declined.value},
        })
        async for i in cursor:
            interested_client_ids.add(i["client_id"])

    query = {}
    if category:
        query["category"] = category
    if state:
        query["state"] = state
    search_filter = _search_filter(search, ["company_name", "product_requirement"])
    if search_filter:
        query.update(search_filter)

    out = []
    async for doc in client_profiles.find(query):
        client_id = str(doc["_id"])
        out.append(MarketplaceClientOut(
            id=client_id,
            already_interested=client_id in interested_client_ids,
            **{k: v for k, v in doc.items() if k != "_id"},
        ))
    return out
