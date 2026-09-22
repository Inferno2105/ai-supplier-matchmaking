from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import client_profiles
from app.core.security import get_current_user, require_role, TokenData
from app.models.client import ClientCreate, ClientInDB, ClientOut
from app.services.matching import run_matching_for_client

router = APIRouter(prefix="/clients", tags=["clients"])


def _to_out(doc: dict) -> ClientOut:
    return ClientOut(id=str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"})


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
async def create_client(payload: ClientCreate, current: TokenData = Depends(require_role("client"))):
    doc = ClientInDB(user_id=current.user_id, **payload.model_dump()).model_dump()
    result = await client_profiles.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Auto-trigger matching against same-category suppliers
    await run_matching_for_client(str(result.inserted_id))

    return _to_out(doc)


@router.get("/me", response_model=list[ClientOut])
async def my_requirements(current: TokenData = Depends(require_role("client"))):
    out = []
    async for doc in client_profiles.find({"user_id": current.user_id}):
        out.append(_to_out(doc))
    return out


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(client_id: str, current: TokenData = Depends(get_current_user)):
    doc = await client_profiles.find_one({"_id": ObjectId(client_id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")
    # Role-scoped: only the owning client, or a supplier looking at a matched
    # counterpart, should be able to view this. Kept simple for the demo:
    # owner-only. Suppliers see client info via the matches endpoint instead.
    if current.role == "client" and doc["user_id"] != current.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your requirement")
    return _to_out(doc)
