"""
User model. A user is either a client or a supplier (role field) and owns
exactly one profile of the matching type (see client.py / supplier.py).
"""

from datetime import datetime, timezone
from enum import Enum
from pydantic import BaseModel, EmailStr, Field


class Role(str, Enum):
    client = "client"
    supplier = "supplier"


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    role: Role


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserInDB(BaseModel):
    email: EmailStr
    password_hash: str
    role: Role
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserOut(BaseModel):
    id: str
    email: EmailStr
    role: Role


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
