from fastapi import APIRouter, HTTPException, status, Depends, Request

from app.core.database import users
from app.core.limiter import limiter
from app.core.security import hash_password, verify_password, create_access_token, get_current_user, TokenData
from app.models.user import UserRegister, UserLogin, UserInDB, UserOut, Token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister):
    existing = await users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user_doc = UserInDB(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        full_name=payload.full_name,
        phone_number=payload.phone_number,
        company_name=payload.company_name,
        supplier_name=payload.supplier_name,
    ).model_dump()
    result = await users.insert_one(user_doc)

    token = create_access_token(subject=str(result.inserted_id), role=payload.role.value)
    return Token(access_token=token)


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, payload: UserLogin):
    user_doc = await users.find_one({"email": payload.email})
    if not user_doc or not verify_password(payload.password, user_doc["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(subject=str(user_doc["_id"]), role=user_doc["role"])
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(current: TokenData = Depends(get_current_user)):
    from bson import ObjectId
    user_doc = await users.find_one({"_id": ObjectId(current.user_id)})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserOut(id=str(user_doc["_id"]), **{k: v for k, v in user_doc.items() if k not in ("_id", "password_hash")})
