"""Verifies withdraw/edit/reactivate for listings, using mock DB + stub embeddings."""
import sys
sys.path.insert(0, ".")

from mongomock_motor import AsyncMongoMockClient
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
dbmod.interests = mock_db["interests"]
dbmod.messages = mock_db["messages"]

import app.services.embeddings as emb_module
def _stub_embed_text(text): return set(text.lower().split())
def _stub_cosine_similarity(a, b):
    if not a or not b: return 0.0
    return len(a & b) / len(a | b) if (a | b) else 0.0
emb_module.embed_text = _stub_embed_text
emb_module.cosine_similarity = _stub_cosine_similarity
import app.services.matching as matching_module
matching_module.embed_text = _stub_embed_text
matching_module.cosine_similarity = _stub_cosine_similarity

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def register(email, role, name):
    payload = {
        "email": email, "password": "pass12345", "role": role,
        "full_name": "Test User", "phone_number": "+91 90000 00000",
    }
    payload["company_name" if role == "client" else "supplier_name"] = name
    r = client.post("/auth/register", json=payload)
    assert r.status_code == 201, r.json()
    return r.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def create_client_profile(token):
    r = client.post("/clients", json={
        "product_requirement": "steel pipes",
        "category": "Raw Materials & Metals", "quantity_required": 500,
        "budget_min": 10000, "budget_max": 20000, "state": "Maharashtra",
        "city": "Mumbai", "delivery_days_needed": 30, "notes": "",
    }, headers=auth(token))
    assert r.status_code == 201, r.json()
    return r.json()["id"]


def create_supplier_profile(token, product="steel piping"):
    r = client.post("/suppliers", json={
        "product_offered": product,
        "category": "Raw Materials & Metals", "available_quantity": 500,
        "price_min": 10000, "price_max": 20000, "state": "Maharashtra",
        "city": "Mumbai", "delivery_days_capable": 20, "notes": "",
    }, headers=auth(token))
    assert r.status_code == 201, r.json()
    return r.json()["id"]


client1_token = register("wd.client1@test.com", "client", "Client One")
supplier1_token = register("wd.supplier1@test.com", "supplier", "Supplier One")
supplier2_token = register("wd.supplier2@test.com", "supplier", "Supplier Two")

client1_id = create_client_profile(client1_token)
supplier1_id = create_supplier_profile(supplier1_token)
supplier2_id = create_supplier_profile(supplier2_token)

print("--- Interest between client1 and supplier1, then withdraw supplier1 ---")
r = client.post("/interests", json={"client_id": client1_id, "supplier_id": supplier1_id}, headers=auth(client1_token))
assert r.status_code == 201, r.json()
interest_id = r.json()["id"]

r = client.get(f"/matches/client/{client1_id}", headers=auth(client1_token))
before_ids = {m["supplier_id"] for m in r.json()}
assert supplier1_id in before_ids and supplier2_id in before_ids, "expected matches against both suppliers before withdrawal"

print("\n--- PATCH /suppliers/{id}/withdraw by a different user (should 403) ---")
r = client.patch(f"/suppliers/{supplier1_id}/withdraw", headers=auth(client1_token))
print(r.status_code, r.json())
assert r.status_code == 403

print("\n--- PATCH /suppliers/{id}/withdraw by the owner ---")
r = client.patch(f"/suppliers/{supplier1_id}/withdraw", headers=auth(supplier1_token))
print(r.status_code, r.json())
assert r.status_code == 200
assert r.json()["is_active"] is False

print("\n--- Withdrawn supplier excluded from marketplace ---")
r = client.get("/marketplace/suppliers", headers=auth(client1_token))
ids = {s["id"] for s in r.json()}
assert supplier1_id not in ids, "withdrawn supplier should not appear in marketplace"
assert supplier2_id in ids

print("\n--- Withdrawn supplier excluded from a NEW client's matching run ---")
client2_id = create_client_profile(client1_token)
r = client.get(f"/matches/client/{client2_id}", headers=auth(client1_token))
new_ids = {m["supplier_id"] for m in r.json()}
assert supplier1_id not in new_ids, "new matching run should skip withdrawn suppliers"
assert supplier2_id in new_ids

print("\n--- Existing match against the withdrawn supplier is untouched, but shows counterpart_is_active=False ---")
r = client.get(f"/matches/client/{client1_id}", headers=auth(client1_token))
match_for_s1 = next(m for m in r.json() if m["supplier_id"] == supplier1_id)
assert match_for_s1["counterpart_is_active"] is False

print("\n--- Existing Interest is untouched, but shows counterpart_is_active=False ---")
r = client.get("/interests/me", headers=auth(client1_token))
interest_after = next(i for i in r.json() if i["id"] == interest_id)
assert interest_after["status"] == "proposed"  # untouched
assert interest_after["counterpart_is_active"] is False

print("\n--- Editing a withdrawn listing is rejected (400) ---")
edit_payload = {
    "product_offered": "premium industrial fasteners",
    "category": "Raw Materials & Metals", "available_quantity": 900,
    "price_min": 10000, "price_max": 20000, "state": "Maharashtra",
    "city": "Mumbai", "delivery_days_capable": 20, "notes": "",
}
r = client.patch(f"/suppliers/{supplier1_id}", json=edit_payload, headers=auth(supplier1_token))
print(r.status_code, r.json())
assert r.status_code == 400

print("\n--- Reactivate, then edit succeeds and re-triggers matching ---")
r = client.patch(f"/suppliers/{supplier1_id}/reactivate", headers=auth(supplier1_token))
assert r.status_code == 200 and r.json()["is_active"] is True

r = client.patch(f"/suppliers/{supplier1_id}", json=edit_payload, headers=auth(supplier1_token))
print(r.status_code, r.json())
assert r.status_code == 200
assert r.json()["product_offered"] == "premium industrial fasteners"

r = client.get(f"/matches/client/{client1_id}", headers=auth(client1_token))
match_for_s1_after_edit = next(m for m in r.json() if m["supplier_id"] == supplier1_id)
assert match_for_s1_after_edit["counterpart_is_active"] is True
assert match_for_s1_after_edit["counterpart_product"] == "premium industrial fasteners"
print(f"  score after edit: {match_for_s1_after_edit['score_total']} (was {match_for_s1['score_total']} while withdrawn)")

print("\n--- Interest record is STILL untouched by the edit ---")
r = client.get("/interests/me", headers=auth(client1_token))
interest_final = next(i for i in r.json() if i["id"] == interest_id)
assert interest_final["status"] == "proposed"
assert interest_final["counterpart_is_active"] is True
# The Interest's own denormalized product snapshot follows the live profile
# (interests.py always reads the current profile at request time, same as
# matches.py) — what must NOT have changed is the Interest's own record:
# status/initiated_by/created_at, which is verified above and below.
assert interest_final["created_at"] == interest_after["created_at"]
assert interest_final["initiated_by"] == interest_after["initiated_by"]

print("\n=== All withdraw/edit checks passed ===")
