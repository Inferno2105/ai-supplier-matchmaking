"""
Match model. Stores the total score AND every sub-score separately, so the
dashboard can render the "why this match?" expansion without recomputing
anything.
"""

from datetime import datetime, timezone
from pydantic import BaseModel, Field


class ScoreBreakdown(BaseModel):
    semantic: float
    price: float
    location: float
    timeline: float
    quantity: float


class MatchInDB(BaseModel):
    client_id: str
    supplier_id: str
    score_total: float
    score_breakdown: ScoreBreakdown
    quantity_fulfilled_ratio: float  # 1.0 = full stock available, <1.0 = partial
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MatchOut(BaseModel):
    id: str
    client_id: str
    supplier_id: str
    score_total: float
    score_label: str  # Excellent / Good / Fair / Poor
    score_breakdown: ScoreBreakdown
    quantity_fulfilled_ratio: float
    created_at: datetime
    # Denormalized display fields, filled in by the route handler
    counterpart_name: str | None = None
    counterpart_product: str | None = None


def score_label(score: float) -> str:
    """Excellent >= 80, Good >= 60, Fair >= 40, else Poor."""
    if score >= 80:
        return "Excellent"
    if score >= 60:
        return "Good"
    if score >= 40:
        return "Fair"
    return "Poor"
