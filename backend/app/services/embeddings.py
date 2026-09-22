"""
Wraps sentence-transformers so the model loads once (expensive) and every
caller just asks for embeddings or a similarity score.
"""

from functools import lru_cache
import numpy as np
from sentence_transformers import SentenceTransformer

from app.core.config import settings


@lru_cache(maxsize=1)
def get_model() -> SentenceTransformer:
    # Cached so the model is loaded exactly once per process, not per request.
    return SentenceTransformer(settings.embedding_model_name)


def embed_text(text: str) -> np.ndarray:
    model = get_model()
    return model.encode(text, convert_to_numpy=True, normalize_embeddings=True)


def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    # Vectors are already normalized (normalize_embeddings=True), so this
    # is just the dot product. Clamp for float drift, then rescale 0-1.
    raw = float(np.dot(vec_a, vec_b))
    raw = max(-1.0, min(1.0, raw))
    return (raw + 1.0) / 2.0  # cosine in [-1,1] -> similarity in [0,1]


def semantic_text_for_client(client) -> str:
    parts = [client.product_requirement, client.category, client.notes or ""]
    return " ".join(p for p in parts if p)


def semantic_text_for_supplier(supplier) -> str:
    parts = [supplier.product_offered, supplier.category, supplier.notes or ""]
    return " ".join(p for p in parts if p)
