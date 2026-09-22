"""
Client-facing and supplier-facing marketplace browsing — every listing on
the other side, not just same-category Match results, with optional
category/state/search filters and an already_interested flag per item.

Company/supplier display names live on the owning User (see
models/user.py), not on the listing, so free-text search across "name or
product" can't be a single Mongo query anymore — the product half stays
a Mongo-level regex filter, and the name half is matched in Python after
batch-resolving names for the candidate listings, which is cheap at this
dataset's scale and avoids an aggregation $lookup for a one-off filter.
"""

import re
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.database import client_profiles, supplier_profiles, interests
from app.core.security import require_role, TokenData
from app.models.client import ClientCreate
from app.models.supplier import SupplierCreate
from app.models.marketplace import MarketplaceSupplierOut, MarketplaceClientOut
from app.models.interest import InterestStatus
from app.services.profiles import batch_display_names

router = APIRouter(prefix="/marketplace", tags=["marketplace"])


async def _own_profile_ids(collection, user_id: str) -> list[str]:
    return [str(d["_id"]) async for d in collection.find({"user_id": user_id})]


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

    # $ne False (not True) treats docs from before is_active existed as active.
    query = {"is_active": {"$ne": False}}
    if category:
        query["category"] = category
    if state:
        query["state"] = state

    docs = [doc async for doc in supplier_profiles.find(query)]
    names = await batch_display_names([d["user_id"] for d in docs], "supplier")

    search_lower = search.strip().lower() if search else None
    product_pattern = re.compile(re.escape(search.strip()), re.IGNORECASE) if search_lower else None

    out = []
    for doc in docs:
        name = names.get(doc["user_id"])
        if search_lower:
            name_hit = name and search_lower in name.lower()
            product_hit = bool(product_pattern and product_pattern.search(doc.get("product_offered", "")))
            if not (name_hit or product_hit):
                continue
        supplier_id = str(doc["_id"])
        known = {k: doc[k] for k in SupplierCreate.model_fields if k in doc}
        out.append(MarketplaceSupplierOut(
            id=supplier_id,
            user_id=doc["user_id"],
            supplier_name=name,
            is_active=doc.get("is_active", True),
            created_at=doc["created_at"],
            already_interested=supplier_id in interested_supplier_ids,
            **known,
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

    query = {"is_active": {"$ne": False}}
    if category:
        query["category"] = category
    if state:
        query["state"] = state

    docs = [doc async for doc in client_profiles.find(query)]
    names = await batch_display_names([d["user_id"] for d in docs], "client")

    search_lower = search.strip().lower() if search else None
    product_pattern = re.compile(re.escape(search.strip()), re.IGNORECASE) if search_lower else None

    out = []
    for doc in docs:
        name = names.get(doc["user_id"])
        if search_lower:
            name_hit = name and search_lower in name.lower()
            product_hit = bool(product_pattern and product_pattern.search(doc.get("product_requirement", "")))
            if not (name_hit or product_hit):
                continue
        client_id = str(doc["_id"])
        known = {k: doc[k] for k in ClientCreate.model_fields if k in doc}
        out.append(MarketplaceClientOut(
            id=client_id,
            user_id=doc["user_id"],
            company_name=name,
            is_active=doc.get("is_active", True),
            created_at=doc["created_at"],
            already_interested=client_id in interested_client_ids,
            **known,
        ))
    return out
