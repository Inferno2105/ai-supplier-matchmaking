"""
Verifies: registration requires/stores the new profile fields with
role-conditional company_name/supplier_name validation, GET/PATCH
/settings/profile, PATCH /settings/password, and that Client/Supplier
listing responses still show company_name/supplier_name correctly after
the migration off the listing models (resolved from the owning User).
"""
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


BASE_CLIENT_REG = {
    "password": "pass12345", "role": "client",
    "full_name": "Priya Sharma", "phone_number": "+91 98765 43210", "company_name": "Acme Corp",
}
BASE_SUPPLIER_REG = {
    "password": "pass12345", "role": "supplier",
    "full_name": "Vikram Desai", "phone_number": "+91 90123 45678", "supplier_name": "SteelCo",
}

print("--- Registration requires full_name/phone_number/company_name (client) ---")
r = client.post("/auth/register", json={"email": "missing1@test.com", "password": "pass12345", "role": "client"})
print(r.status_code)
assert r.status_code == 422, "missing full_name/phone_number/company_name should be rejected"

print("\n--- Registration: client missing company_name (should 422) ---")
r = client.post("/auth/register", json={
    "email": "noco@test.com", "password": "pass12345", "role": "client",
    "full_name": "X", "phone_number": "+91 90000 00000",
})
print(r.status_code, r.json())
assert r.status_code == 422

print("\n--- Registration: client also sending supplier_name (should 422, not silently ignored) ---")
r = client.post("/auth/register", json={
    **BASE_CLIENT_REG, "email": "both1@test.com", "supplier_name": "Sneaky Co",
})
print(r.status_code, r.json())
assert r.status_code == 422

print("\n--- Registration: supplier missing supplier_name (should 422) ---")
r = client.post("/auth/register", json={
    "email": "nosup@test.com", "password": "pass12345", "role": "supplier",
    "full_name": "X", "phone_number": "+91 90000 00000",
})
print(r.status_code, r.json())
assert r.status_code == 422

print("\n--- Registration: supplier also sending company_name (should 422) ---")
r = client.post("/auth/register", json={
    **BASE_SUPPLIER_REG, "email": "both2@test.com", "company_name": "Sneaky Corp",
})
print(r.status_code, r.json())
assert r.status_code == 422

print("\n--- Registration: bad phone number format (should 422) ---")
r = client.post("/auth/register", json={**BASE_CLIENT_REG, "email": "badphone@test.com", "phone_number": "call me maybe"})
print(r.status_code)
assert r.status_code == 422

print("\n--- Valid client registration stores all fields ---")
r = client.post("/auth/register", json={**BASE_CLIENT_REG, "email": "client1@test.com"})
print(r.status_code)
assert r.status_code == 201
client_token = r.json()["access_token"]

r = client.get("/auth/me", headers=auth(client_token))
print(r.status_code, r.json())
assert r.status_code == 200
me = r.json()
assert me["full_name"] == "Priya Sharma"
assert me["phone_number"] == "+91 98765 43210"
assert me["company_name"] == "Acme Corp"
assert me["supplier_name"] is None

print("\n--- Valid supplier registration stores all fields ---")
r = client.post("/auth/register", json={**BASE_SUPPLIER_REG, "email": "supplier1@test.com"})
assert r.status_code == 201
supplier_token = r.json()["access_token"]
r = client.get("/auth/me", headers=auth(supplier_token))
me = r.json()
assert me["supplier_name"] == "SteelCo"
assert me["company_name"] is None

print("\n--- GET /settings/profile ---")
r = client.get("/settings/profile", headers=auth(client_token))
print(r.status_code, r.json())
assert r.status_code == 200
assert r.json()["company_name"] == "Acme Corp"

print("\n--- PATCH /settings/profile updates full_name/phone/company_name ---")
r = client.patch("/settings/profile", json={
    "full_name": "Priya S. Sharma", "phone_number": "+91 98765 00000", "company_name": "Acme Corp Ltd",
}, headers=auth(client_token))
print(r.status_code, r.json())
assert r.status_code == 200
assert r.json()["full_name"] == "Priya S. Sharma"
assert r.json()["company_name"] == "Acme Corp Ltd"

print("\n--- PATCH /settings/profile: client sending supplier_name is rejected (422) ---")
r = client.patch("/settings/profile", json={
    "full_name": "Priya", "phone_number": "+91 98765 00000",
    "company_name": "Acme Corp Ltd", "supplier_name": "Sneaky",
}, headers=auth(client_token))
print(r.status_code, r.json())
assert r.status_code == 422

print("\n--- PATCH /settings/profile: client omitting company_name is rejected (422) ---")
r = client.patch("/settings/profile", json={
    "full_name": "Priya", "phone_number": "+91 98765 00000",
}, headers=auth(client_token))
print(r.status_code, r.json())
assert r.status_code == 422

print("\n--- PATCH /settings/profile does not allow changing email or role ---")
r = client.patch("/settings/profile", json={
    "full_name": "Priya", "phone_number": "+91 98765 00000",
    "company_name": "Acme Corp Ltd", "email": "hacked@test.com",
}, headers=auth(client_token))
print(r.status_code, r.json())
assert r.status_code == 422, "email is not part of ProfileUpdate and extra='forbid' should reject it"

print("\n--- PATCH /settings/password with wrong current_password (401) ---")
r = client.patch("/settings/password", json={
    "current_password": "wrongpass", "new_password": "newpass12345",
}, headers=auth(client_token))
print(r.status_code, r.json())
assert r.status_code == 401

print("\n--- PATCH /settings/password with correct current_password ---")
r = client.patch("/settings/password", json={
    "current_password": "pass12345", "new_password": "newpass12345",
}, headers=auth(client_token))
print(r.status_code)
assert r.status_code == 204

print("\n--- Old password no longer works, new password does ---")
r = client.post("/auth/login", json={"email": "client1@test.com", "password": "pass12345"})
print("old password login:", r.status_code)
assert r.status_code == 401
r = client.post("/auth/login", json={"email": "client1@test.com", "password": "newpass12345"})
print("new password login:", r.status_code)
assert r.status_code == 200

print("\n--- Client/Supplier listing responses show company_name/supplier_name from User ---")
r = client.post("/clients", json={
    "product_requirement": "steel pipes", "category": "Raw Materials & Metals",
    "quantity_required": 500, "budget_min": 10000, "budget_max": 20000,
    "state": "Maharashtra", "city": "Mumbai", "delivery_days_needed": 30, "notes": "",
}, headers=auth(client_token))
print(r.status_code, r.json())
assert r.status_code == 201
assert r.json()["company_name"] == "Acme Corp Ltd", "should reflect the just-updated User.company_name"

print("\n--- Sending company_name directly to POST /clients is rejected (422), not ignored ---")
r = client.post("/clients", json={
    "company_name": "Should Be Rejected",
    "product_requirement": "steel pipes", "category": "Raw Materials & Metals",
    "quantity_required": 500, "budget_min": 10000, "budget_max": 20000,
    "state": "Maharashtra", "city": "Mumbai", "delivery_days_needed": 30, "notes": "",
}, headers=auth(client_token))
print(r.status_code, r.json())
assert r.status_code == 422

r = client.post("/suppliers", json={
    "product_offered": "steel piping", "category": "Raw Materials & Metals",
    "available_quantity": 500, "price_min": 10000, "price_max": 20000,
    "state": "Maharashtra", "city": "Mumbai", "delivery_days_capable": 20, "notes": "",
}, headers=auth(supplier_token))
print(r.status_code, r.json())
assert r.status_code == 201
assert r.json()["supplier_name"] == "SteelCo"

print("\n=== All settings/profile checks passed ===")
