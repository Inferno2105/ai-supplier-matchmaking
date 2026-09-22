from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import supplier_profiles
from app.core.security import get_current_user, require_role, TokenData
from app.models.supplier import SupplierCreate, SupplierInDB, SupplierOut
from app.services.matching import run_matching_for_supplier
from app.services.profiles import supplier_display_name

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


async def _to_out(doc: dict) -> SupplierOut:
    known = {k: doc[k] for k in SupplierCreate.model_fields if k in doc}
    return SupplierOut(
        id=str(doc["_id"]),
        user_id=doc["user_id"],
        supplier_name=await supplier_display_name(doc),
        is_active=doc.get("is_active", True),
        created_at=doc["created_at"],
        **known,
    )


async def _get_owned(supplier_id: str, current: TokenData) -> dict:
    doc = await supplier_profiles.find_one({"_id": ObjectId(supplier_id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offering not found")
    if doc["user_id"] != current.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your offering")
    return doc


@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
async def create_supplier(payload: SupplierCreate, current: TokenData = Depends(require_role("supplier"))):
    doc = SupplierInDB(user_id=current.user_id, **payload.model_dump()).model_dump()
    result = await supplier_profiles.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Auto-trigger matching against same-category clients (mirrors clients.py)
    await run_matching_for_supplier(str(result.inserted_id))

    return await _to_out(doc)


@router.get("/me", response_model=list[SupplierOut])
async def my_offerings(current: TokenData = Depends(require_role("supplier"))):
    out = []
    async for doc in supplier_profiles.find({"user_id": current.user_id}):
        out.append(await _to_out(doc))
    return out


@router.get("/{supplier_id}", response_model=SupplierOut)
async def get_supplier(supplier_id: str, current: TokenData = Depends(get_current_user)):
    # Open to any authenticated user, not just the owner — see clients.py's
    # get_client for the matching rationale.
    doc = await supplier_profiles.find_one({"_id": ObjectId(supplier_id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offering not found")
    return await _to_out(doc)


@router.patch("/{supplier_id}", response_model=SupplierOut)
async def update_supplier(
    supplier_id: str, payload: SupplierCreate, current: TokenData = Depends(require_role("supplier"))
):
    doc = await _get_owned(supplier_id, current)
    if not doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit a withdrawn offering - reactivate it first",
        )
    update_fields = payload.model_dump()
    await supplier_profiles.update_one({"_id": ObjectId(supplier_id)}, {"$set": update_fields})
    doc.update(update_fields)

    # Mirrors clients.py's update_client: re-triggers matching, which
    # upserts existing Match records; existing Interest records untouched.
    await run_matching_for_supplier(supplier_id)

    return await _to_out(doc)


@router.patch("/{supplier_id}/withdraw", response_model=SupplierOut)
async def withdraw_supplier(supplier_id: str, current: TokenData = Depends(require_role("supplier"))):
    doc = await _get_owned(supplier_id, current)
    await supplier_profiles.update_one({"_id": ObjectId(supplier_id)}, {"$set": {"is_active": False}})
    doc["is_active"] = False
    return await _to_out(doc)


@router.patch("/{supplier_id}/reactivate", response_model=SupplierOut)
async def reactivate_supplier(supplier_id: str, current: TokenData = Depends(require_role("supplier"))):
    doc = await _get_owned(supplier_id, current)
    await supplier_profiles.update_one({"_id": ObjectId(supplier_id)}, {"$set": {"is_active": True}})
    doc["is_active"] = True
    return await _to_out(doc)
