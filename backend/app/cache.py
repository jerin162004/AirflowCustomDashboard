import time
import asyncio
from typing import Optional, Tuple, Any

class InMemoryDashboardCache:
    """
    In-memory async thread-safe cache for Airflow dashboard summary.
    Enforces a strict TTL (default 15s) to protect Airflow API from client polling spam.
    """
    def __init__(self, ttl_seconds: int = 15):
        self.ttl_seconds = ttl_seconds
        self._data: Optional[Any] = None
        self._timestamp: float = 0.0
        self._lock = asyncio.Lock()

    async def get_or_fetch(self, fetch_func) -> Tuple[Any, bool, float, float]:
        """
        Returns (data, is_cached_hit, cached_at_timestamp, remaining_ttl_seconds).
        Uses asyncio.Lock to prevent Thundering Herd on cache expiration.
        """
        now = time.time()
        age = now - self._timestamp
        
        # Cache hit check
        if self._data is not None and age < self.ttl_seconds:
            remaining = max(0.0, round(self.ttl_seconds - age, 1))
            return self._data, True, self._timestamp, remaining

        async with self._lock:
            # Re-check after acquiring lock in case another request filled it
            now = time.time()
            age = now - self._timestamp
            if self._data is not None and age < self.ttl_seconds:
                remaining = max(0.0, round(self.ttl_seconds - age, 1))
                return self._data, True, self._timestamp, remaining

            # Fetch fresh data from Airflow REST API
            fresh_data, is_mock = await fetch_func()
            self._data = (fresh_data, is_mock)
            self._timestamp = time.time()
            return self._data, False, self._timestamp, float(self.ttl_seconds)

    def invalidate(self):
        """Invalidates cache to force fresh fetch on next call (e.g. after trigger/pause)."""
        self._timestamp = 0.0
        self._data = None

dashboard_cache = InMemoryDashboardCache(ttl_seconds=15)
