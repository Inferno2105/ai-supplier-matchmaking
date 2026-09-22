from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.database import client_profiles, supplier_profiles, interests, notifications
from app.core.limiter import limiter
from app.core.security import get_current_user, TokenData
from app.models.interest import InterestCreate, InterestInDB, InterestOut, InitiatedBy, InterestStatus
from app.models.notification import NotificationInDB
from app.services.profiles import client_display_name, supplier_display_name

router = APIRouter(prefix="/interests", tags=["interests"])


def _to_out(
    doc: dict,
    counterpart_name: str | None,
    counterpart_product: str | None,
    counterpart_is_active: bool | None = None,
) -> InterestOut:
    return InterestOut(
        id=str(doc["_id"]),
        client_id=doc["client_id"],
        supplier_id=doc["supplier_id"],
        initiated_by=doc["initiated_by"],
        status=doc["status"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        counterpart_name=counterpart_name,
        counterpart_product=counterpart_product,
        counterpart_is_active=counterpart_is_active,
    )


async def _own_profile_ids(collection, user_id: str) -> list[str]:
    return [str(d["_id"]) async for d in collection.find({"user_id": user_id})]


@router.post("", response_model=InterestOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def create_interest(request: Request, payload: InterestCreate, current: TokenData = Depends(get_current_user)):
    client_doc = await client_profiles.find_one({"_id": ObjectId(payload.client_id)})
    supplier_doc = await supplier_profiles.find_one({"_id": ObjectId(payload.supplier_id)})
    if not client_doc or not supplier_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client or supplier not found")

    if current.role == "client":
        if client_doc["user_id"] != current.user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your requirement")
        initiated_by = InitiatedBy.client
    elif current.role == "supplier":
        if supplier_doc["user_id"] != current.user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your offering")
        initiated_by = InitiatedBy.supplier
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unrecognized role")

    active = await interests.find_one({
        "client_id": payload.client_id,
        "supplier_id": payload.supplier_id,
        "status": {"$ne": InterestStatus.declined.value},
    })
    if active:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An active interest already exists between these two")

    # A declined interest only blocks the side that was declined from
    # re-proposing — the side that declined is free to initiate fresh.
    last_declined = await interests.find_one(
        {"client_id": payload.client_id, "supplier_id": payload.supplier_id, "status": InterestStatus.declined.value},
        sort=[("updated_at", -1)],
    )
    if last_declined and last_declined["initiated_by"] == initiated_by.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Your previous proposal to this party was declined - only the other side can re-initiate",
        )

    doc = InterestInDB(
        client_id=payload.client_id,
        supplier_id=payload.supplier_id,
        initiated_by=initiated_by,
    ).model_dump()
    result = await interests.insert_one(doc)
    doc["_id"] = result.inserted_id

    is_client_initiator = initiated_by == InitiatedBy.client
    other_user_id = supplier_doc["user_id"] if is_client_initiator else client_doc["user_id"]
    initiator_name = (
        await client_display_name(client_doc) if is_client_initiator else await supplier_display_name(supplier_doc)
    )
    # NotificationInDB.match_id is reused here as a generic "related record
    # id" — it isn't a Match, but the field predates Interest and the model
    # is not being changed for this feature.
    await notifications.insert_one(NotificationInDB(
        user_id=other_user_id,
        match_id=str(doc["_id"]),
        message=f"{initiator_name} expressed interest in working with you.",
    ).model_dump())

    counterpart_name = (
        await supplier_display_name(supplier_doc) if is_client_initiator else await client_display_name(client_doc)
    )
    counterpart_product = supplier_doc["product_offered"] if is_client_initiator else client_doc["product_requirement"]
    counterpart_active = supplier_doc.get("is_active", True) if is_client_initiator else client_doc.get("is_active", True)
    return _to_out(doc, counterpart_name, counterpart_product, counterpart_active)


@router.get("/me", response_model=list[InterestOut])
async def my_interests(current: TokenData = Depends(get_current_user)):
    if current.role == "client":
        my_ids = await _own_profile_ids(client_profiles, current.user_id)
        query = {"client_id": {"$in": my_ids}}
    elif current.role == "supplier":
        my_ids = await _own_profile_ids(supplier_profiles, current.user_id)
        query = {"supplier_id": {"$in": my_ids}}
    else:
        return []

    if not my_ids:
        return []

    out = []
    async for doc in interests.find(query).sort("created_at", -1):
        client_doc = await client_profiles.find_one({"_id": ObjectId(doc["client_id"])})
        supplier_doc = await supplier_profiles.find_one({"_id": ObjectId(doc["supplier_id"])})
        if current.role == "client":
            name = await supplier_display_name(supplier_doc)
            product = supplier_doc["product_offered"] if supplier_doc else None
            active = supplier_doc.get("is_active", True) if supplier_doc else None
        else:
            name = await client_display_name(client_doc)
            product = client_doc["product_requirement"] if client_doc else None
            active = client_doc.get("is_active", True) if client_doc else None
        out.append(_to_out(doc, name, product, active))
    return out


async def _respond(interest_id: str, current: TokenData, new_status: InterestStatus) -> InterestOut:
    doc = await interests.find_one({"_id": ObjectId(interest_id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interest not found")
    if doc["status"] != InterestStatus.proposed.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Interest already {doc['status']}")

    client_doc = await client_profiles.find_one({"_id": ObjectId(doc["client_id"])})
    supplier_doc = await supplier_profiles.find_one({"_id": ObjectId(doc["supplier_id"])})
    if not client_doc or not supplier_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked client or supplier no longer exists")

    client_initiated = doc["initiated_by"] == InitiatedBy.client.value
    # Only the non-initiating side may accept/decline.
    authorized = (
        (current.role == "supplier" and supplier_doc["user_id"] == current.user_id)
        if client_initiated
        else (current.role == "client" and client_doc["user_id"] == current.user_id)
    )
    if not authorized:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the receiving side can respond to this interest")

    now = datetime.now(timezone.utc)
    await interests.update_one({"_id": doc["_id"]}, {"$set": {"status": new_status.value, "updated_at": now}})
    doc["status"] = new_status.value
    doc["updated_at"] = now

    initiator_user_id = client_doc["user_id"] if client_initiated else supplier_doc["user_id"]
    responder_name = (
        await supplier_display_name(supplier_doc) if client_initiated else await client_display_name(client_doc)
    )
    await notifications.insert_one(NotificationInDB(
        user_id=initiator_user_id,
        match_id=str(doc["_id"]),
        message=f"{responder_name} {new_status.value} your interest.",
    ).model_dump())

    counterpart_name = (
        await supplier_display_name(supplier_doc) if current.role == "client" else await client_display_name(client_doc)
    )
    counterpart_product = supplier_doc["product_offered"] if current.role == "client" else client_doc["product_requirement"]
    counterpart_active = (
        supplier_doc.get("is_active", True) if current.role == "client" else client_doc.get("is_active", True)
    )
    return _to_out(doc, counterpart_name, counterpart_product, counterpart_active)


@router.patch("/{interest_id}/accept", response_model=InterestOut)
async def accept_interest(interest_id: str, current: TokenData = Depends(get_current_user)):
    return await _respond(interest_id, current, InterestStatus.accepted)


@router.patch("/{interest_id}/decline", response_model=InterestOut)
async def decline_interest(interest_id: str, current: TokenData = Depends(get_current_user)):
    return await _respond(interest_id, current, InterestStatus.declined)
