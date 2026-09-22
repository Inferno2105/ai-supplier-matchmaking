from fastapi import APIRouter

from app.data.categories import CATEGORIES
from app.data.locations import STATE_CITIES

router = APIRouter(tags=["reference"])


@router.get("/categories")
async def get_categories():
    return CATEGORIES


@router.get("/locations")
async def get_locations():
    return STATE_CITIES
