"""
Supplier offering model. Mirrors ClientCreate's structure (numeric price
range, numeric delivery days) so the two sides line up cleanly in scoring.
"""

from datetime import datetime, timezone
from pydantic import BaseModel, Field, field_validator


class SupplierCreate(BaseModel):
    supplier_name: str = Field(min_length=1, max_length=200)
    product_offered: str = Field(min_length=1, max_length=2000)
    category: str
    available_quantity: int = Field(gt=0)
    price_min: float = Field(ge=0)
    price_max: float = Field(ge=0)
    state: str
    city: str
    delivery_days_capable: int = Field(gt=0)
    notes: str = ""

    @field_validator("price_max")
    @classmethod
    def max_gte_min(cls, v, info):
        price_min = info.data.get("price_min")
        if price_min is not None and v < price_min:
            raise ValueError("price_max must be >= price_min")
        return v


class SupplierInDB(SupplierCreate):
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SupplierOut(SupplierCreate):
    id: str
    user_id: str
    created_at: datetime
