"""
Interest model — tracks matchmaking interest between a specific client
requirement and supplier offering, independent of the Match/scoring engine.
Expressing interest is a plain record creation; it never triggers matching
or embeddings, and a Match between the same pair (if one exists) is looked
up separately by the frontend rather than resolved here.

Only proposed -> accepted / declined. There's no "completed" status: this
platform tracks matchmaking interest, not deal fulfillment.
"""

from datetime import datetime, timezone
from enum import Enum
from pydantic import BaseModel, Field


class InitiatedBy(str, Enum):
    client = "client"
    supplier = "supplier"


class InterestStatus(str, Enum):
    proposed = "proposed"
    accepted = "accepted"
    declined = "declined"


class InterestCreate(BaseModel):
    client_id: str
    supplier_id: str


class InterestInDB(BaseModel):
    client_id: str
    supplier_id: str
    initiated_by: InitiatedBy
    status: InterestStatus = InterestStatus.proposed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InterestOut(BaseModel):
    id: str
    client_id: str
    supplier_id: str
    initiated_by: InitiatedBy
    status: InterestStatus
    created_at: datetime
    updated_at: datetime
    # Denormalized display fields, filled in by the route handler, relative
    # to whichever side is viewing (mirrors MatchOut's convention).
    counterpart_name: str | None = None
    counterpart_product: str | None = None
