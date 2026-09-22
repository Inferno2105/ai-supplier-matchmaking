"""Verifies rate limits on POST /auth/login (10/min) and POST /interests (20/min)."""
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


def auth(token):
    return {"Authorization": f"Bearer {token}"}


print("--- POST /auth/login rate limit (10/minute) ---")
statuses = []
for i in range(11):
    r = client.post("/auth/login", json={"email": "nobody@test.com", "password": "wrongpass"})
    statuses.append(r.status_code)
print(statuses)
assert statuses[:10] == [401] * 10, "first 10 should be normal 401s (invalid credentials)"
assert statuses[10] == 429, "11th request within the window should be rate-limited"

print("\n--- POST /interests rate limit (20/minute) ---")
r = client.post("/auth/register", json={
    "email": "rl.client@test.com", "password": "pass12345", "role": "client",
    "full_name": "Test User", "phone_number": "+91 90000 00000", "company_name": "RL Client",
})
client_token = r.json()["access_token"]
r = client.post("/clients", json={
    "product_requirement": "steel pipes",
    "category": "Raw Materials & Metals", "quantity_required": 500,
    "budget_min": 10000, "budget_max": 20000, "state": "Maharashtra",
    "city": "Mumbai", "delivery_days_needed": 30, "notes": "",
}, headers=auth(client_token))
assert r.status_code == 201

r = client.post("/auth/register", json={
    "email": "rl.supplier@test.com", "password": "pass12345", "role": "supplier",
    "full_name": "Test User", "phone_number": "+91 90000 00000", "supplier_name": "RL Supplier",
})
supplier_token = r.json()["access_token"]
r = client.post("/suppliers", json={
    "product_offered": "steel piping",
    "category": "Raw Materials & Metals", "available_quantity": 500,
    "price_min": 10000, "price_max": 20000, "state": "Maharashtra",
    "city": "Mumbai", "delivery_days_capable": 20, "notes": "",
}, headers=auth(supplier_token))
assert r.status_code == 201

statuses = []
for i in range(21):
    r = client.post(
        "/auth/register",
        json={
            "email": f"rl.dummy{i}@test.com", "password": "pass12345", "role": "client",
            "full_name": "Test User", "phone_number": "+91 90000 00000", "company_name": f"Dummy {i}",
        },
    )
    dummy_token = r.json()["access_token"]
    r2 = client.post(
        "/clients",
        json={
            "product_requirement": "x",
            "category": "Other", "quantity_required": 1,
            "budget_min": 1, "budget_max": 2, "state": "Delhi",
            "city": "New Delhi", "delivery_days_needed": 1, "notes": "",
        },
        headers=auth(dummy_token),
    )
    dummy_client_id = r2.json()["id"]
    r3 = client.post(
        "/interests",
        json={"client_id": dummy_client_id, "supplier_id": "000000000000000000000000"},
        headers=auth(dummy_token),
    )
    statuses.append(r3.status_code)
print(statuses)
assert statuses[:20] == [404] * 20, "first 20 should be normal 404s (nonexistent supplier)"
assert statuses[20] == 429, "21st request within the window should be rate-limited"

print("\n=== All rate limiting checks passed ===")
