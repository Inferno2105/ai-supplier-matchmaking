from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import matches, client_profiles, supplier_profiles
from app.core.security import get_current_user, TokenData
from app.models.match import MatchOut, ScoreBreakdown, score_label

router = APIRouter(prefix="/matches", tags=["matches"])


def _to_out(doc: dict, counterpart_name: str | None, counterpart_product: str | None) -> MatchOut:
    return MatchOut(
        id=str(doc["_id"]),
        client_id=doc["client_id"],
        supplier_id=doc["supplier_id"],
        score_total=doc["score_total"],
        score_label=score_label(doc["score_total"]),
        score_breakdown=ScoreBreakdown(**doc["score_breakdown"]),
        quantity_fulfilled_ratio=doc["quantity_fulfilled_ratio"],
        created_at=doc["created_at"],
        counterpart_name=counterpart_name,
        counterpart_product=counterpart_product,
    )


@router.get("/client/{client_id}", response_model=list[MatchOut])
async def matches_for_client(client_id: str, current: TokenData = Depends(get_current_user)):
    client_doc = await client_profiles.find_one({"_id": ObjectId(client_id)})
    if not client_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")
    if current.role == "client" and client_doc["user_id"] != current.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your requirement")

    out = []
    async for doc in matches.find({"client_id": client_id}).sort("score_total", -1):
        supplier_doc = await supplier_profiles.find_one({"_id": ObjectId(doc["supplier_id"])})
        name = supplier_doc["supplier_name"] if supplier_doc else None
        product = supplier_doc["product_offered"] if supplier_doc else None
        out.append(_to_out(doc, name, product))
    return out


@router.get("/supplier/{supplier_id}", response_model=list[MatchOut])
async def matches_for_supplier(supplier_id: str, current: TokenData = Depends(get_current_user)):
    supplier_doc = await supplier_profiles.find_one({"_id": ObjectId(supplier_id)})
    if not supplier_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offering not found")
    if current.role == "supplier" and supplier_doc["user_id"] != current.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your offering")

    out = []
    async for doc in matches.find({"supplier_id": supplier_id}).sort("score_total", -1):
        client_doc = await client_profiles.find_one({"_id": ObjectId(doc["client_id"])})
        name = client_doc["company_name"] if client_doc else None
        product = client_doc["product_requirement"] if client_doc else None
        out.append(_to_out(doc, name, product))
    return out
