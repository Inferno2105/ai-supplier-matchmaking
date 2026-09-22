from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.database import ensure_indexes
from app.core.limiter import limiter
from app.routes import (
    auth,
    clients,
    suppliers,
    matches,
    notifications,
    dashboard,
    reference,
    interests,
    marketplace,
    activity,
    messages,
    settings as settings_routes,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    yield


app = FastAPI(title="AI-Powered Client-Supplier Matchmaking Platform", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(suppliers.router)
app.include_router(matches.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)
app.include_router(reference.router)
app.include_router(interests.router)
app.include_router(marketplace.router)
app.include_router(activity.router)
app.include_router(messages.router)
app.include_router(settings_routes.router)


@app.get("/")
async def root():
    return {"status": "ok", "service": "matchmaking-platform-backend"}
