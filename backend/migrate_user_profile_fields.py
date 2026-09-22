"""
One-off migration: copies company_name/supplier_name off existing
Client/Supplier listing documents and onto their owning User document's
new field, for databases seeded before the User model grew full_name,
phone_number, company_name, and supplier_name.

Only sets a User's company_name/supplier_name if it isn't already set,
so it's safe to run more than once. Listing documents are left as-is —
the leftover company_name/supplier_name key on old listing docs is
harmless (ClientCreate/SupplierCreate no longer declare that field, so
it's simply never read from there again) and doesn't need to be deleted.

full_name and phone_number are NOT set by this script — there is no
historical source for them, so accounts migrated this way will have
empty-ish values until the user edits their profile on the Settings
page. That's a one-time gap for pre-existing accounts, not a bug.

This does NOT run automatically on app startup. Run it manually, once,
after upgrading an existing database:

    python migrate_user_profile_fields.py
"""

import asyncio

from bson import ObjectId

from app.core.database import users, client_profiles, supplier_profiles


async def migrate():
    print("Migrating company_name/supplier_name from listings onto their owning User...\n")

    # user_id is stored as a plain string on listing docs (see models/client.py),
    # but _id on the users collection is an ObjectId — resolve via the string form.

    client_updates = 0
    async for doc in client_profiles.find({}):
        company_name = doc.get("company_name")
        if not company_name:
            continue
        user_doc = await users.find_one({"_id": ObjectId(doc["user_id"])})
        if not user_doc or user_doc.get("company_name"):
            continue
        await users.update_one({"_id": user_doc["_id"]}, {"$set": {"company_name": company_name}})
        client_updates += 1
        print(f"  User {user_doc['_id']}: company_name <- \"{company_name}\"")

    supplier_updates = 0
    async for doc in supplier_profiles.find({}):
        supplier_name = doc.get("supplier_name")
        if not supplier_name:
            continue
        user_doc = await users.find_one({"_id": ObjectId(doc["user_id"])})
        if not user_doc or user_doc.get("supplier_name"):
            continue
        await users.update_one({"_id": user_doc["_id"]}, {"$set": {"supplier_name": supplier_name}})
        supplier_updates += 1
        print(f"  User {user_doc['_id']}: supplier_name <- \"{supplier_name}\"")

    print(f"\nDone. Updated {client_updates} client user(s) and {supplier_updates} supplier user(s).")
    print(
        "Note: full_name and phone_number are not backfilled by this script — "
        "migrated accounts should fill those in on the Settings page."
    )


if __name__ == "__main__":
    asyncio.run(migrate())
