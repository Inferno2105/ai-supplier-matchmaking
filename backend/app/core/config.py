"""
Central app configuration, loaded from environment variables (.env in dev).
Keeping every tunable value here means the matching weights, thresholds,
and JWT settings all live in one place instead of scattered magic numbers.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- Database ---
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "matchmaking"

    # --- Auth ---
    jwt_secret: str = "CHANGE_ME_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24 hours; refresh-token rotation is the natural next hardening step

    # --- Matching engine weights (must sum to 1.0) ---
    weight_semantic: float = 0.35
    weight_price: float = 0.25
    weight_location: float = 0.20
    weight_timeline: float = 0.12
    weight_quantity: float = 0.08

    # --- Notification threshold ---
    match_notify_threshold: float = 60.0  # out of 100

    # --- Embedding model ---
    embedding_model_name: str = "all-MiniLM-L6-v2"

    class Config:
        env_file = ".env"


settings = Settings()
