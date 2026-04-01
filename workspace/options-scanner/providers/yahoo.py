"""Yahoo Finance provider implementation using yfinance."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

import pandas as pd
import yfinance as yf
import logging

from .base import DataProvider, DataProviderError


class YahooProvider(DataProvider):
    """Data provider backed by Yahoo Finance via yfinance."""

    CACHE_TTL_SECONDS = 60  # Cache data for 1 minutes

    def __init__(self):
        """Initialize the provider and ensure cache directory exists."""
        # Create cache directory relative to the providers directory
        self.CACHE_DIR = Path(__file__).parent.parent / ".cache"
        self.CACHE_DIR.mkdir(exist_ok=True)

    def _get_cache_key(self, ticker: str, expiration_date: str) -> str:
        """Generate a cache key for the given ticker and expiration."""
        return f"{ticker}_{expiration_date}.json"

    def _is_cache_valid(self, cache_path: Path) -> bool:
        """Check if cache file exists and is not expired."""
        if not cache_path.exists():
            return False
        
        cache_time = cache_path.stat().st_mtime
        current_time = time.time()
        return (current_time - cache_time) < self.CACHE_TTL_SECONDS

    def _load_from_cache(self, ticker: str, expiration_date: str) -> dict[str, Any] | None:
        """Load option chain data from cache if valid."""
        cache_key = [REDACTED] expiration_date)
        cache_path = self.CACHE_DIR / cache_key
        
        if not self._is_cache_valid(cache_path):
            return None
        
        try:
            with cache_path.open("r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None

    def _save_to_cache(self, ticker: str, expiration_date: str, data: dict[str, Any]) -> None:
        """Save option chain data to cache."""
        cache_key = [REDACTED] expiration_date)
        cache_path = self.CACHE_DIR / cache_key
        
        try:
            with cache_path.open("w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass  # Silently fail if caching doesn't work

    def get_expirations(self, ticker: str) -> list[str]:
        """Fetch all available expiration dates for a ticker."""
        try:
            ticker_obj = yf.Ticker(ticker)
            expirations = list(ticker_obj.options or [])
        except Exception as exc:  # pragma: no cover - network/provider exceptions
            raise DataProviderError(f"Failed to fetch expirations for {ticker}: {exc}") from exc

        if not expirations:
            raise DataProviderError(f"No option expirations found for {ticker}.")

        return expirations

    def get_option_chain(self, ticker: str, expiration_date: str) -> dict[str, Any]:
        """Fetch and normalize option chain data for one expiration date."""
        # Try to load from cache first
        cached_data = self._load_from_cache(ticker, expiration_date)
        if cached_data is not None:
            return cached_data
        
        # Cache miss - fetch from API
        try:
            ticker_obj = yf.Ticker(ticker)
            hist = ticker_obj.history(period="1d")
            if hist.empty:
                raise DataProviderError(f"No underlying price data found for {ticker}.")
            underlying_price = float(hist["Close"].iloc[-1])

            chain = ticker_obj.option_chain(expiration_date)
        except DataProviderError:
            raise
        except Exception as exc:  # pragma: no cover - network/provider exceptions
            raise DataProviderError(
                f"Failed to fetch option chain for {ticker} @ {expiration_date}: {exc}"
            ) from exc

        result = {
            "underlying_price": underlying_price,
            "calls": self._normalize_chain_df(chain.calls, option_type="call"),
            "puts": self._normalize_chain_df(chain.puts, option_type="put"),
        }
        
        # Save to cache
        self._save_to_cache(ticker, expiration_date, result)
        
        return result

    @staticmethod
    def _to_float(value: Any) -> float | None:
        """Safely convert a value to float, returning None if conversion fails."""
        if value is None or (isinstance(value, float) and value != value):  # NaN check
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _normalize_chain_df(df: pd.DataFrame, option_type: str) -> list[dict[str, Any]]:
        """Normalize Yahoo DataFrame rows to plain dicts with stable keys."""
        if df is None or df.empty:
            return []

        records: list[dict[str, Any]] = []
        for _, row in df.iterrows():
            records.append(
                {
                    "contract_symbol": row.get("contractSymbol"),
                    "strike": YahooProvider._to_float(row.get("strike")),
                    "bid": YahooProvider._to_float(row.get("bid")),
                    "ask": YahooProvider._to_float(row.get("ask")),
                    "last_price": YahooProvider._to_float(row.get("lastPrice")),
                    "implied_vol": YahooProvider._to_float(row.get("impliedVolatility")),
                    "option_type": option_type,
                }
            )

        return records

    def get_spot_price(self, ticker: str) -> float | None:
        """Fetch the latest spot price for a ticker with caching."""
        cache_key = f"{ticker}_spot.json"
        cache_path = self.CACHE_DIR / cache_key
        
        # Try to load from cache first
        if self._is_cache_valid(cache_path):
            try:
                with cache_path.open("r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("price")
            except Exception:
                pass
        
        logging.info(f"Cache miss for spot price of {ticker}, fetching from API...")
        
        # Cache miss - fetch from API
        try:
            ticker_obj = yf.Ticker(ticker)
            hist = ticker_obj.history(period="1d")
            if hist.empty:
                return None
            price = float(hist["Close"].iloc[-1])
            
            # Save to cache
            cache_data = {"price": price}
            try:
                with cache_path.open("w", encoding="utf-8") as f:
                    json.dump(cache_data, f, indent=2)
            except Exception:
                pass  # Silently fail if caching doesn't work
            
            return price
        except Exception:
            return None
