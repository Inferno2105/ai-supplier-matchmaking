"""Verifies the FastAPI app boots and responds, using mock DB + stub embeddings."""
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

print("--- GET / ---")
r = client.get("/")
print(r.status_code, r.json())
assert r.status_code == 200

print("\n--- GET /categories ---")
r = client.get("/categories")
print(r.status_code, len(r.json()), "categories")
assert r.status_code == 200 and len(r.json()) > 0

print("\n--- GET /locations ---")
r = client.get("/locations")
print(r.status_code, len(r.json()), "states")
assert r.status_code == 200

print("\n--- POST /auth/register (client) ---")
r = client.post("/auth/register", json={"email": "test@acme.com", "password": "pass12345", "role": "client"})
print(r.status_code, r.json())
assert r.status_code == 201
token = r.json()["access_token"]

print("\n--- GET /auth/me ---")
r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
print(r.status_code, r.json())
assert r.status_code == 200
assert r.json()["role"] == "client"

print("\n--- POST /clients (auto-triggers matching, 0 suppliers yet) ---")
r = client.post("/clients", json={
    "company_name": "Acme Corp", "product_requirement": "steel pipes",
    "category": "Raw Materials & Metals", "quantity_required": 500,
    "budget_min": 10000, "budget_max": 20000, "state": "Maharashtra",
    "city": "Mumbai", "delivery_days_needed": 30, "notes": ""
}, headers={"Authorization": f"Bearer {token}"})
print(r.status_code, r.json())
assert r.status_code == 201
acme_client_id = r.json()["id"]

print("\n--- GET /dashboard/overview ---")
r = client.get("/dashboard/overview")
print(r.status_code, r.json())
assert r.status_code == 200
assert r.json()["total_clients"] == 1

print("\n--- POST /clients as wrong role (should 403) ---")
r2 = client.post("/auth/register", json={"email": "sup@steel.com", "password": "pass12345", "role": "supplier"})
sup_token = r2.json()["access_token"]
r = client.post("/clients", json={
    "company_name": "X", "product_requirement": "x", "category": "Other",
    "quantity_required": 1, "budget_min": 1, "budget_max": 2, "state": "Delhi",
    "city": "New Delhi", "delivery_days_needed": 1, "notes": ""
}, headers={"Authorization": f"Bearer {sup_token}"})
print(r.status_code, r.json())
assert r.status_code == 403

print("\n--- GET /clients/me without token (should 401) ---")
r = client.get("/clients/me")
print(r.status_code)
assert r.status_code == 401

print("\n--- POST /suppliers as the supplier account ---")
r = client.post("/suppliers", json={
    "supplier_name": "SteelCo", "product_offered": "steel piping",
    "category": "Raw Materials & Metals", "available_quantity": 500,
    "price_min": 10000, "price_max": 20000, "state": "Maharashtra",
    "city": "Mumbai", "delivery_days_capable": 20, "notes": ""
}, headers={"Authorization": f"Bearer {sup_token}"})
print(r.status_code, r.json())
assert r.status_code == 201
steelco_supplier_id = r.json()["id"]

print("\n--- GET /clients/{id} as a DIFFERENT user's supplier account (should 200, not 403) ---")
r = client.get(f"/clients/{acme_client_id}", headers={"Authorization": f"Bearer {sup_token}"})
print(r.status_code, r.json())
assert r.status_code == 200

print("\n--- GET /suppliers/{id} as a DIFFERENT user's client account (should 200, not 403) ---")
r = client.get(f"/suppliers/{steelco_supplier_id}", headers={"Authorization": f"Bearer {token}"})
print(r.status_code, r.json())
assert r.status_code == 200

print("\n--- GET /clients/{id} without a token (should still 401) ---")
r = client.get(f"/clients/{acme_client_id}")
print(r.status_code)
assert r.status_code == 401

print("\n=== All server boot checks passed ===")
