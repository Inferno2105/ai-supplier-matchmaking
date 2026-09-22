"""
User model. A user is either a client or a supplier (role field) and owns
exactly one profile of the matching type (see client.py / supplier.py).

Company/supplier identity (company_name / supplier_name) lives here, not
on the listing models — a user registers once with their business name,
and every listing they submit displays it denormalized from this record.
"""

from datetime import datetime, timezone
from enum import Enum
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

PHONE_PATTERN = r"^[\d+\-\s]+$"


class Role(str, Enum):
    client = "client"
    supplier = "supplier"


class _ProfileFieldsMixin(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str = Field(min_length=1, max_length=200)
    phone_number: str = Field(min_length=7, max_length=20)
    company_name: str | None = Field(default=None, min_length=1, max_length=200)
    supplier_name: str | None = Field(default=None, min_length=1, max_length=200)

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        import re

        if not re.match(PHONE_PATTERN, v):
            raise ValueError("Phone number may only contain digits, spaces, hyphens, and a leading +")
        return v


class UserRegister(_ProfileFieldsMixin):
    email: EmailStr
    password: str = Field(min_length=8)
    role: Role

    @model_validator(mode="after")
    def check_role_conditional_identity(self):
        if self.role == Role.client:
            if not self.company_name:
                raise ValueError("company_name is required for a client account")
            if self.supplier_name:
                raise ValueError("supplier_name must not be set for a client account")
        elif self.role == Role.supplier:
            if not self.supplier_name:
                raise ValueError("supplier_name is required for a supplier account")
            if self.company_name:
                raise ValueError("company_name must not be set for a supplier account")
        return self


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserInDB(_ProfileFieldsMixin):
    email: EmailStr
    password_hash: str
    role: Role
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserOut(BaseModel):
    id: str
    email: EmailStr
    role: Role
    # Defaulted, not required: an account created before these fields
    # existed (and not yet backfilled via the Settings page) would
    # otherwise fail to load at all.
    full_name: str = ""
    phone_number: str = ""
    company_name: str | None = None
    supplier_name: str | None = None
    created_at: datetime


class ProfileUpdate(_ProfileFieldsMixin):
    """
    Same shape as registration's profile fields, minus email/password/role
    (none of those are editable here). Role-conditional validation (only
    the field matching the CURRENT user's role may be set) happens in the
    route, since role isn't part of this request body.
    """


class PasswordUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_password: str
    new_password: str = Field(min_length=8)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
