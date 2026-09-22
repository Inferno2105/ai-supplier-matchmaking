"""
Self-service profile and password management. Email and role are
intentionally not editable here — see models/user.py's ProfileUpdate
docstring and the module-level note in the task spec this implements.
"""

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import users
from app.core.security import get_current_user, hash_password, verify_password, TokenData
from app.models.user import PasswordUpdate, ProfileUpdate, Role, UserOut

router = APIRouter(prefix="/settings", tags=["settings"])


async def _get_current_user_doc(current: TokenData) -> dict:
    user_doc = await users.find_one({"_id": ObjectId(current.user_id)})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user_doc


def _to_out(user_doc: dict) -> UserOut:
    return UserOut(id=str(user_doc["_id"]), **{k: v for k, v in user_doc.items() if k not in ("_id", "password_hash")})


@router.get("/profile", response_model=UserOut)
async def get_profile(current: TokenData = Depends(get_current_user)):
    user_doc = await _get_current_user_doc(current)
    return _to_out(user_doc)


@router.patch("/profile", response_model=UserOut)
async def update_profile(payload: ProfileUpdate, current: TokenData = Depends(get_current_user)):
    if current.role == Role.client.value:
        if not payload.company_name:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="company_name is required")
        if payload.supplier_name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="supplier_name must not be set for a client account",
            )
    elif current.role == Role.supplier.value:
        if not payload.supplier_name:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="supplier_name is required")
        if payload.company_name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="company_name must not be set for a supplier account",
            )

    update_fields = payload.model_dump()
    await users.update_one({"_id": ObjectId(current.user_id)}, {"$set": update_fields})
    user_doc = await _get_current_user_doc(current)
    return _to_out(user_doc)


@router.patch("/password", status_code=status.HTTP_204_NO_CONTENT)
async def update_password(payload: PasswordUpdate, current: TokenData = Depends(get_current_user)):
    user_doc = await _get_current_user_doc(current)
    if not verify_password(payload.current_password, user_doc["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")

    await users.update_one(
        {"_id": ObjectId(current.user_id)},
        {"$set": {"password_hash": hash_password(payload.new_password)}},
    )
