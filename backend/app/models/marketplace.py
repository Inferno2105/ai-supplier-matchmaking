"""
Read-only marketplace listing shapes — the full Client/Supplier profile
plus whether the browsing user already has a non-declined Interest with
that listing, so the frontend can disable "Express Interest" accordingly.
"""

from app.models.client import ClientOut
from app.models.supplier import SupplierOut


class MarketplaceSupplierOut(SupplierOut):
    already_interested: bool


class MarketplaceClientOut(ClientOut):
    already_interested: bool
