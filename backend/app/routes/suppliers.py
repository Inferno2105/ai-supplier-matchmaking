from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import supplier_profiles
from app.core.security import get_current_user, require_role, TokenData
from app.models.supplier import SupplierCreate, SupplierInDB, SupplierOut
from app.services.matching import run_matching_for_supplier

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


def _to_out(doc: dict) -> SupplierOut:
    return SupplierOut(id=str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"})


@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
async def create_supplier(payload: SupplierCreate, current: TokenData = Depends(require_role("supplier"))):
    doc = SupplierInDB(user_id=current.user_id, **payload.model_dump()).model_dump()
    result = await supplier_profiles.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Auto-trigger matching against same-category clients (mirrors clients.py)
    await run_matching_for_supplier(str(result.inserted_id))

    return _to_out(doc)


@router.get("/me", response_model=list[SupplierOut])
async def my_offerings(current: TokenData = Depends(require_role("supplier"))):
    out = []
    async for doc in supplier_profiles.find({"user_id": current.user_id}):
        out.append(_to_out(doc))
    return out


@router.get("/{supplier_id}", response_model=SupplierOut)
async def get_supplier(supplier_id: str, current: TokenData = Depends(get_current_user)):
    doc = await supplier_profiles.find_one({"_id": ObjectId(supplier_id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offering not found")
    if current.role == "supplier" and doc["user_id"] != current.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your offering")
    return _to_out(doc)
