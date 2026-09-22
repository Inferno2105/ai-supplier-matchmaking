"""
The four non-semantic sub-scores. Each returns a float in [0, 100] so they
combine cleanly with the semantic score under the same weighted sum.
"""


def price_fit_score(budget_min: float, budget_max: float, price_min: float, price_max: float) -> float:
    """
    Range-overlap score between client budget and supplier price.
    100 = full overlap (supplier's whole range fits inside budget, or vice versa).
    0 = no overlap at all.
    Partial overlap is scored by the overlapping fraction of the narrower range.
    """
    overlap_low = max(budget_min, price_min)
    overlap_high = min(budget_max, price_max)
    overlap = max(0.0, overlap_high - overlap_low)

    narrower_range = min(budget_max - budget_min, price_max - price_min)
    if narrower_range <= 0:
        # Degenerate case: a single-point budget or price. Score by whether
        # the point falls inside the other side's range.
        if price_min <= budget_min <= price_max or budget_min <= price_min <= budget_max:
            return 100.0
        return 0.0

    return round(min(1.0, overlap / narrower_range) * 100, 2)


def location_score(client_state: str, client_city: str, supplier_state: str, supplier_city: str) -> float:
    """3-tier score: same city > same state > different state."""
    if client_city == supplier_city and client_state == supplier_state:
        return 100.0
    if client_state == supplier_state:
        return 60.0
    return 20.0


def timeline_score(days_needed: int, days_capable: int) -> float:
    """
    100 if the supplier can deliver at or before the client's deadline.
    Otherwise scales down the further the supplier is over the deadline,
    reaching 0 once the supplier needs double (or more) the allowed time.
    """
    if days_capable <= days_needed:
        return 100.0
    overrun_ratio = (days_capable - days_needed) / days_needed
    return round(max(0.0, 1.0 - overrun_ratio) * 100, 2)


def quantity_fit_ratio(available_quantity: int, quantity_required: int) -> float:
    """Raw ratio (not *100) — also stored separately on the Match for the 'partial stock' badge."""
    if quantity_required <= 0:
        return 1.0
    return min(available_quantity / quantity_required, 1.0)


def quantity_score(available_quantity: int, quantity_required: int) -> float:
    return round(quantity_fit_ratio(available_quantity, quantity_required) * 100, 2)
