"""Verifies the /activity/me feed and Interest-scoped messaging, using mock DB + stub embeddings."""
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


client_token = register("am.client@test.com", "client", "Acme Manufacturing")
supplier_token = register("am.supplier@test.com", "supplier", "SteelCo Industries")
outsider_token = register("am.outsider@test.com", "client", "Outsider Co")

r = client.post("/clients", json={
    "product_requirement": "High-grade stainless steel pipes for industrial plumbing, corrosion resistant",
    "category": "Raw Materials & Metals", "quantity_required": 1000,
    "budget_min": 50000, "budget_max": 80000, "state": "Maharashtra",
    "city": "Mumbai", "delivery_days_needed": 20, "notes": "",
}, headers=auth(client_token))
assert r.status_code == 201
client_id = r.json()["id"]

r = client.post("/suppliers", json={
    "product_offered": "Industrial stainless steel piping, corrosion resistant, ISO 9001 certified",
    "category": "Raw Materials & Metals", "available_quantity": 1200,
    "price_min": 55000, "price_max": 75000, "state": "Maharashtra",
    "city": "Mumbai", "delivery_days_capable": 15, "notes": "",
}, headers=auth(supplier_token))
assert r.status_code == 201
supplier_id = r.json()["id"]

r = client.get(f"/matches/client/{client_id}", headers=auth(client_token))
assert r.status_code == 200 and len(r.json()) == 1
match_score = r.json()[0]["score_total"]
print(f"match score: {match_score}")
assert match_score >= 60, "expected this pair to clear the notification threshold"

print("\n--- POST /interests ---")
r = client.post("/interests", json={"client_id": client_id, "supplier_id": supplier_id}, headers=auth(client_token))
assert r.status_code == 201
interest_id = r.json()["id"]

print("\n--- Messaging on a 'proposed' interest (should 403) ---")
r = client.post(f"/interests/{interest_id}/messages", json={"text": "hello"}, headers=auth(client_token))
print(r.status_code, r.json())
assert r.status_code == 403

r = client.patch(f"/interests/{interest_id}/accept", headers=auth(supplier_token))
assert r.status_code == 200

print("\n--- Messaging on an 'accepted' interest ---")
r = client.post(f"/interests/{interest_id}/messages", json={"text": "Hi, interested in a bulk deal?"}, headers=auth(client_token))
print(r.status_code, r.json())
assert r.status_code == 201

r = client.post(f"/interests/{interest_id}/messages", json={"text": "Sure, let's talk quantities."}, headers=auth(supplier_token))
print(r.status_code, r.json())
assert r.status_code == 201

print("\n--- GET messages, oldest-first ---")
r = client.get(f"/interests/{interest_id}/messages", headers=auth(client_token))
print(r.status_code, [m["text"] for m in r.json()])
assert r.status_code == 200
msgs = r.json()
assert len(msgs) == 2
assert msgs[0]["text"] == "Hi, interested in a bulk deal?"
assert msgs[1]["text"] == "Sure, let's talk quantities."

print("\n--- A non-party user cannot read or post messages (should 403) ---")
r = client.get(f"/interests/{interest_id}/messages", headers=auth(outsider_token))
print("GET as outsider:", r.status_code)
assert r.status_code == 403
r = client.post(f"/interests/{interest_id}/messages", json={"text": "hi"}, headers=auth(outsider_token))
print("POST as outsider:", r.status_code)
assert r.status_code == 403

print("\n--- A new message notifies the OTHER party ---")
r = client.get("/notifications/me", headers=auth(supplier_token))
assert any("New message from Acme Manufacturing" in n["message"] for n in r.json())

print("\n--- has_messages / has_chat filter (batched, no N+1) ---")
r = client.post("/clients", json={
    "product_requirement": "chatless requirement", "category": "Raw Materials & Metals",
    "quantity_required": 1, "budget_min": 1, "budget_max": 2, "state": "Delhi",
    "city": "New Delhi", "delivery_days_needed": 1, "notes": "",
}, headers=auth(client_token))
client_id_2 = r.json()["id"]
r = client.post("/interests", json={"client_id": client_id_2, "supplier_id": supplier_id}, headers=auth(client_token))
interest_id_2 = r.json()["id"]
assert r.json()["has_messages"] is False, "brand new interest must not report has_messages"
client.patch(f"/interests/{interest_id_2}/accept", headers=auth(supplier_token))
# interest_id has messages (sent above), interest_id_2 is accepted but has none

r = client.get("/interests/me", headers=auth(client_token))
by_id = {i["id"]: i for i in r.json()}
assert by_id[interest_id]["has_messages"] is True
assert by_id[interest_id_2]["has_messages"] is False
print("has_messages per interest:", {k: v["has_messages"] for k, v in by_id.items()})

r = client.get("/interests/me", params={"has_chat": "true"}, headers=auth(client_token))
ids = [i["id"] for i in r.json()]
assert ids == [interest_id], ids
print("has_chat=true filter:", ids)

r = client.get("/interests/me", params={"has_chat": "false"}, headers=auth(client_token))
ids = [i["id"] for i in r.json()]
assert ids == [interest_id_2], ids
print("has_chat=false filter:", ids)

print("\n--- GET /activity/me merges notifications, interest, and match entries ---")
r = client.get("/activity/me", headers=auth(client_token))
print(r.status_code)
assert r.status_code == 200
activity = r.json()
types_seen = {item["type"] for item in activity}
print("types seen:", types_seen, "count:", len(activity))
assert "notification" in types_seen
assert "interest" in types_seen
assert "match" in types_seen
# newest-first
timestamps = [item["timestamp"] for item in activity]
assert timestamps == sorted(timestamps, reverse=True), "activity feed must be newest-first"

print("\n=== All activity/messaging checks passed ===")
