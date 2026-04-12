"""Great-circle distance on Earth (WGS84 sphere approximation)."""

import math

_EARTH_RADIUS_M = 6_371_000


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance between two WGS84 points in meters."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return _EARTH_RADIUS_M * c
