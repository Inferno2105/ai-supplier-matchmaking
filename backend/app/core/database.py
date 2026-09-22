"""
Async MongoDB connection via Motor. One client, reused across the app.
Collections are exposed as simple module-level accessors so routes/services
don't need to know connection details.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client: AsyncIOMotorClient = AsyncIOMotorClient(settings.mongo_uri)
db = client[settings.mongo_db_name]

users = db["users"]
client_profiles = db["client_profiles"]
supplier_profiles = db["supplier_profiles"]
matches = db["matches"]
notifications = db["notifications"]
interests = db["interests"]


async def ensure_indexes():
    """Call once at startup. Keeps lookups fast and enforces uniqueness where it matters."""
    await users.create_index("email", unique=True)
    await client_profiles.create_index("user_id")
    await client_profiles.create_index("category")
    await supplier_profiles.create_index("user_id")
    await supplier_profiles.create_index("category")
    await matches.create_index([("client_id", 1), ("supplier_id", 1)], unique=True)
    await matches.create_index("client_id")
    await matches.create_index("supplier_id")
    await notifications.create_index("user_id")
    # Not unique: a declined Interest can be followed by a fresh one from
    # the other side, so the same (client_id, supplier_id) pair can have
    # more than one Interest document over time.
    await interests.create_index([("client_id", 1), ("supplier_id", 1)])
    await interests.create_index("client_id")
    await interests.create_index("supplier_id")
