"""
GET /dashboard/overview — aggregate stats only, no auth complexity, no
admin role. Gives system-wide visibility without any admin-role
engineering cost.
"""

from fastapi import APIRouter

from app.core.database import client_profiles, supplier_profiles, matches

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview")
async def overview():
    total_clients = await client_profiles.count_documents({})
    total_suppliers = await supplier_profiles.count_documents({})
    total_matches = await matches.count_documents({})

    avg_score = 0.0
    pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$score_total"}}}]
    async for row in matches.aggregate(pipeline):
        avg_score = round(row["avg"], 2) if row["avg"] else 0.0

    return {
        "total_clients": total_clients,
        "total_suppliers": total_suppliers,
        "total_matches": total_matches,
        "average_match_score": avg_score,
    }
