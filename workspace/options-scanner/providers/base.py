"""Base interfaces for option data providers."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class DataProviderError(Exception):
    """Raised when a data provider cannot fulfill a request."""


class DataProvider(ABC):
    """Abstract provider interface for option data retrieval."""

    @abstractmethod
    def get_expirations(self, ticker: str) -> list[str]:
        """Return available option expiration dates (YYYY-MM-DD) for a ticker."""

    @abstractmethod
    def get_option_chain(self, ticker: str, expiration_date: str) -> dict[str, Any]:
        """Return standardized option chain data for one ticker and expiration.

        Expected dictionary shape:
            {
                "underlying_price": float,
                "calls": list[dict],
                "puts": list[dict],
            }
        """

    @abstractmethod
    def get_spot_price(self, ticker: str) -> float | None:
        """Return the latest spot price for a ticker."""
