from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import ensure_indexes
from app.routes import auth, clients, suppliers, matches, notifications, dashboard, reference


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    yield


app = FastAPI(title="AI-Powered Client-Supplier Matchmaking Platform", lifespan=lifespan)

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


@app.get("/")
async def root():
    return {"status": "ok", "service": "matchmaking-platform-backend"}
