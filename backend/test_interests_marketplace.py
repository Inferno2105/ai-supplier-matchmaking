"""Verifies Interest creation/accept/decline rules and marketplace browsing, using mock DB + stub embeddings."""
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


def register(email, role):
    r = client.post("/auth/register", json={"email": email, "password": "pass12345", "role": role})
    assert r.status_code == 201, r.json()
    return r.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def create_client_profile(token, company_name, category="Raw Materials & Metals"):
    r = client.post("/clients", json={
        "company_name": company_name, "product_requirement": "steel pipes",
        "category": category, "quantity_required": 500,
        "budget_min": 10000, "budget_max": 20000, "state": "Maharashtra",
        "city": "Mumbai", "delivery_days_needed": 30, "notes": "",
    }, headers=auth(token))
    assert r.status_code == 201, r.json()
    return r.json()["id"]


def create_supplier_profile(token, supplier_name, category="Raw Materials & Metals"):
    r = client.post("/suppliers", json={
        "supplier_name": supplier_name, "product_offered": "steel piping",
        "category": category, "available_quantity": 500,
        "price_min": 10000, "price_max": 20000, "state": "Maharashtra",
        "city": "Mumbai", "delivery_days_capable": 20, "notes": "",
    }, headers=auth(token))
    assert r.status_code == 201, r.json()
    return r.json()["id"]


# --- Setup: two client/supplier pairs ---
client1_token = register("client1@test.com", "client")
supplier1_token = register("supplier1@test.com", "supplier")
client1_id = create_client_profile(client1_token, "Client One")
supplier1_id = create_supplier_profile(supplier1_token, "Supplier One")

client2_token = register("client2@test.com", "client")
supplier2_token = register("supplier2@test.com", "supplier")
client2_id = create_client_profile(client2_token, "Client Two")
supplier2_id = create_supplier_profile(supplier2_token, "Supplier Two")

print("--- POST /interests (client-initiated) ---")
r = client.post("/interests", json={"client_id": client1_id, "supplier_id": supplier1_id}, headers=auth(client1_token))
print(r.status_code, r.json())
assert r.status_code == 201
assert r.json()["initiated_by"] == "client"
assert r.json()["status"] == "proposed"
interest1_id = r.json()["id"]

print("\n--- POST /interests duplicate (should 409) ---")
r = client.post("/interests", json={"client_id": client1_id, "supplier_id": supplier1_id}, headers=auth(client1_token))
print(r.status_code, r.json())
assert r.status_code == 409

print("\n--- PATCH accept by the initiating side (should 403) ---")
r = client.patch(f"/interests/{interest1_id}/accept", headers=auth(client1_token))
print(r.status_code, r.json())
assert r.status_code == 403

print("\n--- PATCH accept by the receiving side (supplier) ---")
r = client.patch(f"/interests/{interest1_id}/accept", headers=auth(supplier1_token))
print(r.status_code, r.json())
assert r.status_code == 200
assert r.json()["status"] == "accepted"

print("\n--- Decline + re-propose rules ---")
r = client.post("/interests", json={"client_id": client2_id, "supplier_id": supplier2_id}, headers=auth(client2_token))
assert r.status_code == 201
interest2_id = r.json()["id"]

r = client.patch(f"/interests/{interest2_id}/decline", headers=auth(supplier2_token))
print("decline:", r.status_code, r.json())
assert r.status_code == 200
assert r.json()["status"] == "declined"

print("\n--- Declined side (client2) re-proposing (should 409) ---")
r = client.post("/interests", json={"client_id": client2_id, "supplier_id": supplier2_id}, headers=auth(client2_token))
print(r.status_code, r.json())
assert r.status_code == 409

print("\n--- Other side (supplier2) initiating fresh interest (should succeed) ---")
r = client.post("/interests", json={"client_id": client2_id, "supplier_id": supplier2_id}, headers=auth(supplier2_token))
print(r.status_code, r.json())
assert r.status_code == 201
assert r.json()["initiated_by"] == "supplier"

print("\n--- GET /interests/me for client2 (expect 2: declined + new proposed) ---")
r = client.get("/interests/me", headers=auth(client2_token))
print(r.status_code, [i["status"] for i in r.json()])
assert r.status_code == 200
assert len(r.json()) == 2

print("\n--- Marketplace: client1 browses suppliers, supplier1 should show already_interested ---")
r = client.get("/marketplace/suppliers", headers=auth(client1_token))
print(r.status_code)
assert r.status_code == 200
by_id = {s["id"]: s for s in r.json()}
assert by_id[supplier1_id]["already_interested"] is True
assert by_id[supplier2_id]["already_interested"] is False

print("\n--- Marketplace: category filter ---")
r = client.get("/marketplace/suppliers", params={"category": "Raw Materials & Metals"}, headers=auth(client1_token))
assert r.status_code == 200 and len(r.json()) == 2
r = client.get("/marketplace/suppliers", params={"category": "Electronics & Components"}, headers=auth(client1_token))
assert r.status_code == 200 and len(r.json()) == 0

print("\n--- Marketplace: wrong-role access (should 403) ---")
r = client.get("/marketplace/suppliers", headers=auth(supplier1_token))
print("supplier calling /marketplace/suppliers:", r.status_code)
assert r.status_code == 403
r = client.get("/marketplace/clients", headers=auth(client1_token))
print("client calling /marketplace/clients:", r.status_code)
assert r.status_code == 403

print("\n=== All interest/marketplace checks passed ===")
