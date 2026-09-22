"""
Client requirement model. Budget and delivery timeline are numeric, not
free text, so scoring stays reliable. `notes` is free text and feeds the
embedding model alongside product_requirement, but is not used in any
numeric sub-score.

Company identity (company_name) is NOT part of this model — it lives on
the owning User (see models/user.py) and is only ever denormalized onto
ClientOut at read time, never stored or user-editable here. extra="forbid"
means a client_name sent to these endpoints is rejected, not silently
dropped.
"""

from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ClientCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_requirement: str = Field(min_length=1, max_length=2000)
    category: str
    quantity_required: int = Field(gt=0)
    budget_min: float = Field(ge=0)
    budget_max: float = Field(ge=0)
    state: str
    city: str
    delivery_days_needed: int = Field(gt=0)
    notes: str = ""

    @field_validator("budget_max")
    @classmethod
    def max_gte_min(cls, v, info):
        budget_min = info.data.get("budget_min")
        if budget_min is not None and v < budget_min:
            raise ValueError("budget_max must be >= budget_min")
        return v


class ClientInDB(ClientCreate):
    user_id: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ClientOut(ClientCreate):
    id: str
    user_id: str
    company_name: str
    is_active: bool = True
    created_at: datetime
