"""
Standalone smoke test for the matching pipeline, using an in-memory
mongomock-motor client instead of a real MongoDB server (none available in
this sandbox). Exercises: create client -> create supplier -> auto-match ->
verify score breakdown -> verify notifications created.

Not a replacement for running against real MongoDB before submission, but
proves the matching logic itself is correct.
"""

import asyncio
import sys

sys.path.insert(0, ".")

from mongomock_motor import AsyncMongoMockClient

# Patch the database module's collections BEFORE importing anything that uses them
import app.core.database as dbmod
mock_client = AsyncMongoMockClient()
mock_db = mock_client["matchmaking_test"]
dbmod.client = mock_client
dbmod.db = mock_db
dbmod.users = mock_db["users"]
dbmod.client_profiles = mock_db["client_profiles"]
dbmod.supplier_profiles = mock_db["supplier_profiles"]
dbmod.matches = mock_db["matches"]
dbmod.notifications = mock_db["notifications"]

from app.core.security import hash_password
from app.models.user import UserInDB, Role
from app.models.client import ClientCreate, ClientInDB
from app.models.supplier import SupplierCreate, SupplierInDB

# --- Stub out the embedding model: no network access to huggingface.co in
# this sandbox. Substitutes a crude keyword-overlap "similarity" so the
# REST of the pipeline (weighting, storage, notifications) can be verified
# end-to-end. This stub is NOT what ships — app/services/embeddings.py is
# unchanged and will use the real sentence-transformers model when this
# runs somewhere with internet access (i.e. your machine). ---
import app.services.embeddings as emb_module

def _stub_embed_text(text: str):
    return set(text.lower().split())

def _stub_cosine_similarity(a, b):
    if not a or not b:
        return 0.0
    overlap = len(a & b)
    union = len(a | b)
    return overlap / union if union else 0.0

emb_module.embed_text = _stub_embed_text
emb_module.cosine_similarity = _stub_cosine_similarity

import app.services.matching as matching_module
matching_module.embed_text = _stub_embed_text
matching_module.cosine_similarity = _stub_cosine_similarity

from app.services.matching import run_matching_for_client


async def main():
    print("=== Pipeline smoke test ===\n")

    # 1. Create a client user + requirement
    client_user = UserInDB(email="client@acme.com", password_hash=hash_password("pass12345"), role=Role.client).model_dump()
    client_user_id = str((await dbmod.users.insert_one(client_user)).inserted_id)

    client_payload = ClientCreate(
        company_name="Acme Manufacturing",
        product_requirement="High-grade stainless steel pipes for industrial plumbing, corrosion resistant",
        category="Raw Materials & Metals",
        quantity_required=1000,
        budget_min=50000,
        budget_max=80000,
        state="Maharashtra",
        city="Mumbai",
        delivery_days_needed=20,
        notes="Prefer ISO certified supplier",
    )
    client_doc = ClientInDB(user_id=client_user_id, **client_payload.model_dump()).model_dump()
    client_id = str((await dbmod.client_profiles.insert_one(client_doc)).inserted_id)
    print(f"Created client requirement: {client_id}")

    # 2. Create a supplier user + offering (good match: same category, similar product, overlapping budget)
    supplier_user = UserInDB(email="supplier@steelco.com", password_hash=hash_password("pass12345"), role=Role.supplier).model_dump()
    supplier_user_id = str((await dbmod.users.insert_one(supplier_user)).inserted_id)

    supplier_payload = SupplierCreate(
        supplier_name="SteelCo Industries",
        product_offered="Industrial stainless steel piping, corrosion resistant, ISO 9001 certified",
        category="Raw Materials & Metals",
        available_quantity=1200,
        price_min=55000,
        price_max=75000,
        state="Maharashtra",
        city="Mumbai",
        delivery_days_capable=15,
        notes="Bulk discounts available",
    )
    supplier_doc = SupplierInDB(user_id=supplier_user_id, **supplier_payload.model_dump()).model_dump()
    supplier_id = str((await dbmod.supplier_profiles.insert_one(supplier_doc)).inserted_id)
    print(f"Created supplier offering: {supplier_id}")

    # 3. A second supplier — deliberately a poor match (different location, tight budget, less stock)
    supplier2_user = UserInDB(email="supplier2@farsupply.com", password_hash=hash_password("pass12345"), role=Role.supplier).model_dump()
    supplier2_user_id = str((await dbmod.users.insert_one(supplier2_user)).inserted_id)

    supplier2_payload = SupplierCreate(
        supplier_name="Far Supply Co",
        product_offered="Plastic garden hoses for home use",
        category="Raw Materials & Metals",  # same category but wildly different product on purpose
        available_quantity=200,
        price_min=90000,
        price_max=120000,
        state="West Bengal",
        city="Kolkata",
        delivery_days_capable=45,
        notes="",
    )
    supplier2_doc = SupplierInDB(user_id=supplier2_user_id, **supplier2_payload.model_dump()).model_dump()
    supplier2_id = str((await dbmod.supplier_profiles.insert_one(supplier2_doc)).inserted_id)
    print(f"Created second (poor-match) supplier offering: {supplier2_id}\n")

    # 4. Run matching for the client (as the POST /clients route would do automatically)
    print("Running matching engine...")
    results = await run_matching_for_client(client_id)

    print(f"\n{len(results)} match(es) found, ranked:\n")
    for r in results:
        match_doc = await dbmod.matches.find_one({"_id": __import__("bson").ObjectId(r["match_id"])})
        sb = match_doc["score_breakdown"]
        print(f"  Supplier {r['supplier_id']}: total={r['score_total']}")
        print(f"    semantic={sb['semantic']}  price={sb['price']}  location={sb['location']}  timeline={sb['timeline']}  quantity={sb['quantity']}")
        print(f"    quantity_fulfilled_ratio={match_doc['quantity_fulfilled_ratio']}")

    # 5. Sanity assertions
    assert len(results) == 2, f"expected 2 matches, got {len(results)}"
    good_match = next(r for r in results if r["supplier_id"] == supplier_id)
    poor_match = next(r for r in results if r["supplier_id"] == supplier2_id)
    assert good_match["score_total"] > poor_match["score_total"], "good match should outrank poor match"
    assert good_match["score_total"] > 60, f"good match should be well above threshold, got {good_match['score_total']}"
    print(f"\nPASS: good match ({good_match['score_total']}) correctly outranks poor match ({poor_match['score_total']})")

    # 6. Verify notifications were created for the good match (score should clear 60% threshold)
    notif_count = await dbmod.notifications.count_documents({})
    print(f"\nNotifications created: {notif_count}")
    assert notif_count >= 2, "expected at least 2 notifications (client + supplier) for the good match"
    async for n in dbmod.notifications.find({}):
        print(f"  -> user {n['user_id']}: {n['message']}")

    print("\n=== All checks passed ===")


if __name__ == "__main__":
    asyncio.run(main())
