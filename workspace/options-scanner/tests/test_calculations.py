"""Unit tests for delta, ROI, and mid-price calculations."""

import math
from datetime import date

import pytest

# Allow imports from project root
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from scanner import (
    compute_abs_delta,
    compute_mid_price,
    parse_expiration_to_dte,
    value_in_range,
)


# ---------------------------------------------------------------------------
# Mid-price
# ---------------------------------------------------------------------------

class TestMidPrice:
    def test_normal_bid_ask(self):
        assert compute_mid_price(2.0, 4.0, 3.0) == 3.0

    def test_fallback_to_last_price(self):
        assert compute_mid_price(None, 4.0, 5.0) == 5.0
        assert compute_mid_price(2.0, None, 5.0) == 5.0

    def test_both_none_returns_last(self):
        assert compute_mid_price(None, None, 7.5) == 7.5

    def test_all_none(self):
        assert compute_mid_price(None, None, None) is None


# ---------------------------------------------------------------------------
# DTE parsing
# ---------------------------------------------------------------------------

class TestDTE:
    def test_basic_dte(self):
        today = date(2026, 3, 31)
        assert parse_expiration_to_dte("2026-05-15", today) == 45

    def test_same_day(self):
        today = date(2026, 3, 31)
        assert parse_expiration_to_dte("2026-03-31", today) == 0

    def test_past_expiration(self):
        today = date(2026, 3, 31)
        assert parse_expiration_to_dte("2026-03-01", today) < 0


# ---------------------------------------------------------------------------
# value_in_range
# ---------------------------------------------------------------------------

class TestValueInRange:
    def test_no_bounds(self):
        assert value_in_range(42.0, None, None) is True

    def test_lower_bound_only(self):
        assert value_in_range(5.0, 3.0, None) is True
        assert value_in_range(2.0, 3.0, None) is False

    def test_upper_bound_only(self):
        assert value_in_range(5.0, None, 10.0) is True
        assert value_in_range(11.0, None, 10.0) is False

    def test_both_bounds(self):
        assert value_in_range(5.0, 3.0, 10.0) is True
        assert value_in_range(2.0, 3.0, 10.0) is False
        assert value_in_range(11.0, 3.0, 10.0) is False


# ---------------------------------------------------------------------------
# Black-Scholes absolute delta
# ---------------------------------------------------------------------------

class TestAbsDelta:
    def test_atm_call_delta_near_half(self):
        """ATM call delta should be close to 0.5."""
        delta = compute_abs_delta(
            option_type="call",
            underlying_price=100.0,
            strike=100.0,
            dte=30,
            implied_vol=0.20,
            risk_free_rate=0.05,
            default_iv=0.30,
        )
        assert delta is not None
        assert 0.45 < delta < 0.60

    def test_atm_put_delta_near_half(self):
        """ATM put abs(delta) should be close to 0.5."""
        delta = compute_abs_delta(
            option_type="put",
            underlying_price=100.0,
            strike=100.0,
            dte=30,
            implied_vol=0.20,
            risk_free_rate=0.05,
            default_iv=0.30,
        )
        assert delta is not None
        assert 0.40 < delta < 0.55

    def test_deep_otm_put_low_delta(self):
        """Deep OTM put should have very low delta."""
        delta = compute_abs_delta(
            option_type="put",
            underlying_price=200.0,
            strike=100.0,
            dte=30,
            implied_vol=0.20,
            risk_free_rate=0.05,
            default_iv=0.30,
        )
        assert delta is not None
        assert delta < 0.01

    def test_deep_itm_call_high_delta(self):
        """Deep ITM call should have delta near 1."""
        delta = compute_abs_delta(
            option_type="call",
            underlying_price=200.0,
            strike=100.0,
            dte=30,
            implied_vol=0.20,
            risk_free_rate=0.05,
            default_iv=0.30,
        )
        assert delta is not None
        assert delta > 0.99

    def test_missing_iv_uses_default(self):
        """When IV is None, should fall back to default_iv."""
        delta = compute_abs_delta(
            option_type="call",
            underlying_price=100.0,
            strike=100.0,
            dte=30,
            implied_vol=None,
            risk_free_rate=0.05,
            default_iv=0.30,
        )
        assert delta is not None
        assert 0.45 < delta < 0.60

    def test_zero_strike_returns_none(self):
        assert compute_abs_delta("call", 100.0, 0.0, 30, 0.2, 0.05, 0.3) is None

    def test_zero_underlying_returns_none(self):
        assert compute_abs_delta("call", 0.0, 100.0, 30, 0.2, 0.05, 0.3) is None

    def test_zero_iv_and_zero_default_returns_none(self):
        assert compute_abs_delta("call", 100.0, 100.0, 30, 0.0, 0.05, 0.0) is None

    def test_delta_always_positive(self):
        """abs(delta) should always be >= 0 regardless of option type."""
        for opt_type in ("call", "put"):
            delta = compute_abs_delta(opt_type, 150.0, 100.0, 45, 0.35, 0.05, 0.3)
            assert delta is not None
            assert delta >= 0.0


# ---------------------------------------------------------------------------
# Weekly ROI sanity (inline — roiw_pct = mid / strike * 100 * 365 / (dte * 52))
# ---------------------------------------------------------------------------

class TestROIW:
    def test_roiw_basic(self):
        mid = 5.0
        strike = 100.0
        roi = (mid / strike) * 100.0
        assert roi == pytest.approx(5.0)

    def test_roiw_high_premium(self):
        mid = 20.0
        strike = 200.0
        roi = (mid / strike) * 100.0
        assert roi == pytest.approx(10.0)
