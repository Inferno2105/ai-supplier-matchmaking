from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import client_profiles
from app.core.security import get_current_user, require_role, TokenData
from app.models.client import ClientCreate, ClientInDB, ClientOut
from app.services.matching import run_matching_for_client
from app.services.profiles import client_display_name

router = APIRouter(prefix="/clients", tags=["clients"])


async def _to_out(doc: dict) -> ClientOut:
    known = {k: doc[k] for k in ClientCreate.model_fields if k in doc}
    return ClientOut(
        id=str(doc["_id"]),
        user_id=doc["user_id"],
        company_name=await client_display_name(doc),
        is_active=doc.get("is_active", True),
        created_at=doc["created_at"],
        **known,
    )


async def _get_owned(client_id: str, current: TokenData) -> dict:
    doc = await client_profiles.find_one({"_id": ObjectId(client_id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")
    if doc["user_id"] != current.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your requirement")
    return doc


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
async def create_client(payload: ClientCreate, current: TokenData = Depends(require_role("client"))):
    doc = ClientInDB(user_id=current.user_id, **payload.model_dump()).model_dump()
    result = await client_profiles.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Auto-trigger matching against same-category suppliers
    await run_matching_for_client(str(result.inserted_id))

    return await _to_out(doc)


@router.get("/me", response_model=list[ClientOut])
async def my_requirements(current: TokenData = Depends(require_role("client"))):
    out = []
    async for doc in client_profiles.find({"user_id": current.user_id}):
        out.append(await _to_out(doc))
    return out


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(client_id: str, current: TokenData = Depends(get_current_user)):
    # Open to any authenticated user, not just the owner — the marketplace
    # endpoints already expose these same fields to any authenticated user,
    # so this closes an inconsistency rather than adding new exposure.
    doc = await client_profiles.find_one({"_id": ObjectId(client_id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")
    return await _to_out(doc)


@router.patch("/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: str, payload: ClientCreate, current: TokenData = Depends(require_role("client"))
):
    doc = await _get_owned(client_id, current)
    if not doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit a withdrawn requirement - reactivate it first",
        )
    update_fields = payload.model_dump()
    await client_profiles.update_one({"_id": ObjectId(client_id)}, {"$set": update_fields})
    doc.update(update_fields)

    # Same call used on creation — re-scores this requirement against
    # same-category suppliers and upserts the existing Match records
    # (matching.py's upsert is keyed on client_id+supplier_id, so this
    # overwrites rather than duplicates). Existing Interest records are
    # untouched by design.
    await run_matching_for_client(client_id)

    return await _to_out(doc)


@router.patch("/{client_id}/withdraw", response_model=ClientOut)
async def withdraw_client(client_id: str, current: TokenData = Depends(require_role("client"))):
    doc = await _get_owned(client_id, current)
    await client_profiles.update_one({"_id": ObjectId(client_id)}, {"$set": {"is_active": False}})
    doc["is_active"] = False
    return await _to_out(doc)


@router.patch("/{client_id}/reactivate", response_model=ClientOut)
async def reactivate_client(client_id: str, current: TokenData = Depends(require_role("client"))):
    doc = await _get_owned(client_id, current)
    await client_profiles.update_one({"_id": ObjectId(client_id)}, {"$set": {"is_active": True}})
    doc["is_active"] = True
    return await _to_out(doc)
