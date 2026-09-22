"""
The matching engine. This runs automatically on every new client or
supplier submission:

    filter by fixed category
      -> score every same-category pair on 5 weighted sub-factors
      -> weighted sum -> total score
      -> store match record with full breakdown
      -> if score clears the threshold, notify both sides

Category filtering is a hard filter — cross-category pairs are never
scored. Quantity is a soft score, never a hard filter.
"""

from bson import ObjectId

from app.core.config import settings
from app.core.database import client_profiles, supplier_profiles, matches, notifications
from app.models.match import MatchInDB, ScoreBreakdown
from app.models.notification import NotificationInDB
from app.models.client import ClientCreate
from app.models.supplier import SupplierCreate
from app.services import scoring
from app.services.embeddings import embed_text, cosine_similarity, semantic_text_for_client, semantic_text_for_supplier
from app.services.profiles import client_display_name, supplier_display_name


def _weighted_total(breakdown: ScoreBreakdown) -> float:
    total = (
        breakdown.semantic * settings.weight_semantic
        + breakdown.price * settings.weight_price
        + breakdown.location * settings.weight_location
        + breakdown.timeline * settings.weight_timeline
        + breakdown.quantity * settings.weight_quantity
    )
    return round(total, 2)


async def _score_pair(client_doc: dict, supplier_doc: dict) -> tuple[ScoreBreakdown, float, float]:
    """Returns (breakdown, total_score, quantity_fulfilled_ratio)."""
    # Filter to declared fields only — a doc predating the company_name/
    # supplier_name migration off these models still carries that key as a
    # harmless leftover in Mongo, but ClientCreate/SupplierCreate now use
    # extra="forbid" for their normal role as request-body validators, so
    # it must not be passed through here.
    client = ClientCreate(**{k: v for k, v in client_doc.items() if k in ClientCreate.model_fields})
    supplier = SupplierCreate(**{k: v for k, v in supplier_doc.items() if k in SupplierCreate.model_fields})

    client_vec = embed_text(semantic_text_for_client(client))
    supplier_vec = embed_text(semantic_text_for_supplier(supplier))
    semantic = round(cosine_similarity(client_vec, supplier_vec) * 100, 2)

    price = scoring.price_fit_score(client.budget_min, client.budget_max, supplier.price_min, supplier.price_max)
    location = scoring.location_score(client.state, client.city, supplier.state, supplier.city)
    timeline = scoring.timeline_score(client.delivery_days_needed, supplier.delivery_days_capable)
    quantity = scoring.quantity_score(supplier.available_quantity, client.quantity_required)
    qty_ratio = scoring.quantity_fit_ratio(supplier.available_quantity, client.quantity_required)

    breakdown = ScoreBreakdown(semantic=semantic, price=price, location=location, timeline=timeline, quantity=quantity)
    total = _weighted_total(breakdown)
    return breakdown, total, qty_ratio


async def _upsert_match(client_id: str, supplier_id: str, breakdown: ScoreBreakdown, total: float, qty_ratio: float):
    existing = await matches.find_one({"client_id": client_id, "supplier_id": supplier_id})
    doc = MatchInDB(
        client_id=client_id,
        supplier_id=supplier_id,
        score_total=total,
        score_breakdown=breakdown,
        quantity_fulfilled_ratio=qty_ratio,
    ).model_dump()

    if existing:
        await matches.update_one({"_id": existing["_id"]}, {"$set": doc})
        match_id = str(existing["_id"])
    else:
        result = await matches.insert_one(doc)
        match_id = str(result.inserted_id)

    if total >= settings.match_notify_threshold:
        await _notify_both_sides(match_id, client_id, supplier_id, total)

    return match_id, total


async def _notify_both_sides(match_id: str, client_id: str, supplier_id: str, score: float):
    client_doc = await client_profiles.find_one({"_id": ObjectId(client_id)})
    supplier_doc = await supplier_profiles.find_one({"_id": ObjectId(supplier_id)})
    if not client_doc or not supplier_doc:
        return

    supplier_name = await supplier_display_name(supplier_doc)
    client_name = await client_display_name(client_doc)

    client_msg = NotificationInDB(
        user_id=client_doc["user_id"],
        match_id=match_id,
        message=f"New match found: {supplier_name} scored {score}% for your \"{client_doc['product_requirement'][:60]}\" requirement.",
    ).model_dump()
    supplier_msg = NotificationInDB(
        user_id=supplier_doc["user_id"],
        match_id=match_id,
        message=f"New match found: {client_name} scored {score}% for your \"{supplier_doc['product_offered'][:60]}\" offering.",
    ).model_dump()

    await notifications.insert_one(client_msg)
    await notifications.insert_one(supplier_msg)


async def run_matching_for_client(client_id: str):
    """Called right after a client submits a new requirement."""
    client_doc = await client_profiles.find_one({"_id": ObjectId(client_id)})
    if not client_doc:
        return []

    # $ne False (not True) treats docs from before is_active existed as active.
    suppliers = supplier_profiles.find({"category": client_doc["category"], "is_active": {"$ne": False}})
    results = []
    async for supplier_doc in suppliers:
        supplier_id = str(supplier_doc["_id"])
        breakdown, total, qty_ratio = await _score_pair(client_doc, supplier_doc)
        match_id, total = await _upsert_match(client_id, supplier_id, breakdown, total, qty_ratio)
        results.append({"match_id": match_id, "supplier_id": supplier_id, "score_total": total})

    results.sort(key=lambda r: r["score_total"], reverse=True)
    return results


async def run_matching_for_supplier(supplier_id: str):
    """Called right after a supplier submits a new offering. Mirrors run_matching_for_client."""
    supplier_doc = await supplier_profiles.find_one({"_id": ObjectId(supplier_id)})
    if not supplier_doc:
        return []

    clients = client_profiles.find({"category": supplier_doc["category"], "is_active": {"$ne": False}})
    results = []
    async for client_doc in clients:
        client_id = str(client_doc["_id"])
        breakdown, total, qty_ratio = await _score_pair(client_doc, supplier_doc)
        match_id, total = await _upsert_match(client_id, supplier_id, breakdown, total, qty_ratio)
        results.append({"match_id": match_id, "client_id": client_id, "score_total": total})

    results.sort(key=lambda r: r["score_total"], reverse=True)
    return results
