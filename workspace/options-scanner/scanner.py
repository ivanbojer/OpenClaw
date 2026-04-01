"""Option chain scanner CLI.

Scans option chains across multiple tickers, computes derived metrics (ROI, DTE,
absolute delta), applies filters, and prints/saves matching contracts.
"""

from __future__ import annotations

import argparse
import csv
import math
import sys
import time
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any

import yaml
from scipy.stats import norm
from tabulate import tabulate

from providers import DataProvider, DataProviderError, YahooProvider


DEFAULT_CONFIG_PATH = "criteria.yaml"
DEFAULT_RISK_FREE_RATE = 0.05
DEFAULT_IV = 0.30
RATE_LIMIT_SECONDS = 0.5


@dataclass
class Criteria:
    """Runtime criteria for filtering option contracts."""

    option_type: str = "both"
    delta_min: float | None = None
    delta_max: float | None = None
    roiw_min: float | None = None
    roiw_max: float | None = None
    dte_min: int | None = None
    dte_max: int | None = None


@dataclass
class Settings:
    """Runtime settings for provider and numeric defaults."""

    provider: str = "yahoo"
    risk_free_rate: float = DEFAULT_RISK_FREE_RATE
    default_iv: float = DEFAULT_IV
    output_csv: str | None = None


def parse_args() -> argparse.Namespace:
    """Define and parse command-line arguments."""
    parser = argparse.ArgumentParser(description="Scan option chains by configurable criteria")

    parser.add_argument("--config", default=DEFAULT_CONFIG_PATH, help="Path to YAML config file")
    parser.add_argument("--tickers", help="Comma-separated ticker list (e.g. GME,MSTR,AMZN)")

    parser.add_argument("--option-type", choices=["call", "put", "both"], help="Option side")
    parser.add_argument("--delta-min", type=float, help="Minimum absolute delta")
    parser.add_argument("--delta-max", type=float, help="Maximum absolute delta")
    parser.add_argument("--roiw-min", type=float, help="Minimum weekly ROI percent")
    parser.add_argument("--roiw-max", type=float, help="Maximum weekly ROI percent")
    parser.add_argument("--dte-min", type=int, help="Minimum DTE (days)")
    parser.add_argument("--dte-max", type=int, help="Maximum DTE (days)")

    parser.add_argument("--provider", choices=["yahoo"], help="Data provider")
    parser.add_argument("--risk-free-rate", type=float, help="Risk-free rate for delta calculation")
    parser.add_argument("--default-iv", type=float, help="Fallback implied volatility when missing")
    parser.add_argument("--output", help="Optional CSV output path")

    return parser.parse_args()


def load_yaml_config(path: str | None) -> dict[str, Any]:
    """Load YAML config and return a normalized dictionary."""
    if not path:
        return {}

    config_path = Path(path)
    if not config_path.exists():
        if path == DEFAULT_CONFIG_PATH:
            return {}
        raise FileNotFoundError(f"Config file not found: {path}")

    with config_path.open("r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}

    if not isinstance(data, dict):
        raise ValueError("Config file must contain a top-level mapping")

    return data


def parse_tickers(raw: str | None) -> list[str] | None:
    """Parse comma-separated tickers into uppercase symbol list."""
    if raw is None:
        return None

    tickers = [item.strip().upper() for item in raw.split(",") if item.strip()]
    return tickers


def build_runtime_config(args: argparse.Namespace, config: dict[str, Any]) -> tuple[list[str], Criteria, Settings]:
    """Merge CLI arguments over YAML config and return runtime objects."""
    config_tickers = config.get("tickers") if isinstance(config.get("tickers"), list) else []
    cli_tickers = parse_tickers(args.tickers)
    tickers = cli_tickers if cli_tickers is not None else [str(t).upper() for t in config_tickers]

    config_criteria = config.get("criteria", {}) if isinstance(config.get("criteria"), dict) else {}
    criteria = Criteria(
        option_type=args.option_type or config_criteria.get("option_type", "both"),
        delta_min=args.delta_min if args.delta_min is not None else config_criteria.get("delta_min"),
        delta_max=args.delta_max if args.delta_max is not None else config_criteria.get("delta_max"),
        roiw_min=args.roiw_min if args.roiw_min is not None else config_criteria.get("roiw_min"),
        roiw_max=args.roiw_max if args.roiw_max is not None else config_criteria.get("roiw_max"),
        dte_min=args.dte_min if args.dte_min is not None else config_criteria.get("dte_min"),
        dte_max=args.dte_max if args.dte_max is not None else config_criteria.get("dte_max"),
    )

    config_settings = config.get("settings", {}) if isinstance(config.get("settings"), dict) else {}
    settings = Settings(
        provider=args.provider or config_settings.get("provider", "yahoo"),
        risk_free_rate=(
            args.risk_free_rate
            if args.risk_free_rate is not None
            else config_settings.get("risk_free_rate", DEFAULT_RISK_FREE_RATE)
        ),
        default_iv=(
            args.default_iv
            if args.default_iv is not None
            else config_settings.get("default_iv", DEFAULT_IV)
        ),
        output_csv=args.output or config_settings.get("output_csv"),
    )

    return tickers, criteria, settings


def create_provider(name: str) -> DataProvider:
    """Factory for provider instances."""
    if name == "yahoo":
        return YahooProvider()
    raise ValueError(f"Unsupported provider: {name}")


def compute_mid_price(bid: float | None, ask: float | None, last_price: float | None) -> float | None:
    """Compute midpoint from bid/ask with fallback to last trade price."""
    if bid is not None and ask is not None:
        return (bid + ask) / 2.0
    return last_price


def compute_abs_delta(
    option_type: str,
    underlying_price: float,
    strike: float,
    dte: int,
    implied_vol: float | None,
    risk_free_rate: float,
    default_iv: float,
) -> float | None:
    """Compute Black-Scholes absolute delta for calls/puts."""
    if underlying_price <= 0 or strike <= 0:
        return None

    t = max(dte / 365.0, 1e-9)
    sigma = implied_vol if implied_vol and implied_vol > 0 else default_iv
    if sigma <= 0:
        return None

    denominator = sigma * math.sqrt(t)
    if denominator <= 0:
        return None

    d1 = (math.log(underlying_price / strike) + (risk_free_rate + 0.5 * sigma * sigma) * t) / denominator

    if option_type == "call":
        delta = norm.cdf(d1)
    else:
        delta = norm.cdf(d1) - 1.0

    return abs(float(delta))


def parse_expiration_to_dte(expiration: str, today: date) -> int:
    """Convert expiration date string to DTE in calendar days."""
    exp_date = datetime.strptime(expiration, "%Y-%m-%d").date()
    return (exp_date - today).days


def value_in_range(value: float, lower: float | None, upper: float | None) -> bool:
    """Return True when a value is within optional inclusive bounds."""
    if lower is not None and value < lower:
        return False
    if upper is not None and value > upper:
        return False
    return True


def scan_ticker(
    provider: DataProvider,
    ticker: str,
    criteria: Criteria,
    settings: Settings,
    today: date,
    spot_price=None,
) -> list[dict[str, Any]]:
    """Scan one ticker and return contracts matching all criteria."""
    matches: list[dict[str, Any]] = []

    expirations = provider.get_expirations(ticker)
    for expiration in expirations:
        dte = parse_expiration_to_dte(expiration, today)

        if criteria.dte_min is not None or criteria.dte_max is not None:
            if not value_in_range(float(dte), criteria.dte_min, criteria.dte_max):
                continue

        chain = provider.get_option_chain(ticker, expiration)
        underlying_price = chain.get("underlying_price")
        if underlying_price is None or underlying_price <= 0:
            continue

        option_rows: list[dict[str, Any]] = []
        if criteria.option_type in ("call", "both"):
            option_rows.extend(chain.get("calls", []))
        if criteria.option_type in ("put", "both"):
            option_rows.extend(chain.get("puts", []))

        for contract in option_rows:
            strike = contract.get("strike")
            if strike is None or strike <= 0:
                continue

            bid = contract.get("bid")
            ask = contract.get("ask")
            last_price = contract.get("last_price")
            implied_vol = contract.get("implied_vol")
            option_type = contract.get("option_type")
            contract_symbol = contract.get("contract_symbol")

            mid_price = compute_mid_price(bid, ask, last_price)
            if mid_price is None or mid_price < 0:
                continue

            roi_pct = (mid_price / strike) * 100.0 * (365.0 / (dte * 52.0)) if dte > 0 else 0.0
            delta = compute_abs_delta(
                option_type=option_type,
                underlying_price=underlying_price,
                strike=strike,
                dte=max(dte, 0),
                implied_vol=implied_vol,
                risk_free_rate=settings.risk_free_rate,
                default_iv=settings.default_iv,
            )
            if delta is None:
                continue

            if not value_in_range(delta, criteria.delta_min, criteria.delta_max):
                continue
            if not value_in_range(roi_pct, criteria.roiw_min, criteria.roiw_max):
                continue
            if not value_in_range(float(dte), criteria.dte_min, criteria.dte_max):
                continue

            matches.append(
                {
                    "ticker": ticker,
                    "underlying_price": spot_price,
                    "expiration": expiration,
                    "strike": strike,
                    "bid": bid,
                    "ask": ask,
                    "mid_price": mid_price,
                    "last_price": last_price,
                    "implied_vol": implied_vol,
                    "delta": delta,
                    "roiw_pct": roi_pct,
                    "dte": dte,
                    "contract_symbol": contract_symbol,
                }
            )

    return matches


def print_results(results: list[dict[str, Any]]) -> None:
    """Render results as a formatted console table."""
    headers = [
        "ticker",
        "underlying_price",
        "expiration",
        "strike",
        "bid",
        "ask",
        "mid_price",
        "last_price",
        "implied_vol",
        "delta",
        "roiw_pct",
        "dte",
        "contract_symbol",
    ]

    if not results:
        print("No matching contracts found.")
        return

    # Find the max ROI per ticker
    max_roiw_per_ticker: dict[str, float] = {}
    for row in results:
        ticker = row["ticker"]
        roiw = row["roiw_pct"]
        if ticker not in max_roiw_per_ticker or roiw > max_roiw_per_ticker[ticker]:
            max_roiw_per_ticker[ticker] = roiw

    # ANSI color codes
    BOLD_GREEN = "\033[1;32m"
    RESET = "\033[0m"

    table = []
    for row in results:
        roiw_str = f"{row['roiw_pct']:.3f}"
        # Bold and green the ROI value if it's the max for this ticker
        if row["roiw_pct"] == max_roiw_per_ticker[row["ticker"]]:
            roiw_str = f"{BOLD_GREEN}{roiw_str}{RESET}"

        table.append(
            [
                row["ticker"],
                "" if row.get("underlying_price") is None else f"{row['underlying_price']:.2f}",
                row["expiration"],
                f"{row['strike']:.2f}",
                "" if row["bid"] is None else f"{row['bid']:.2f}",
                "" if row["ask"] is None else f"{row['ask']:.2f}",
                f"{row['mid_price']:.2f}",
                "" if row["last_price"] is None else f"{row['last_price']:.2f}",
                "" if row["implied_vol"] is None else f"{row['implied_vol']:.4f}",
                f"{row['delta']:.4f}",
                roiw_str,
                row["dte"],
                row["contract_symbol"],
            ]
        )

    print(tabulate(table, headers=headers, tablefmt="github"))


def write_csv(path: str, results: list[dict[str, Any]]) -> None:
    """Write scan results to CSV file."""
    fieldnames = [
        "ticker",
        "underlying_price",
        "expiration",
        "strike",
        "bid",
        "ask",
        "mid_price",
        "last_price",
        "implied_vol",
        "delta",
        "roiw_pct",
        "dte",
        "contract_symbol",
    ]

    out_path = Path(path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with out_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)


def main() -> int:
    """Program entry point."""
    args = parse_args()

    try:
        config = load_yaml_config(args.config)
        tickers, criteria, settings = build_runtime_config(args, config)
    except Exception as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 2

    if not tickers:
        print("No tickers provided. Use --tickers or set tickers in config.", file=sys.stderr)
        return 2

    try:
        provider = create_provider(settings.provider)
    except Exception as exc:
        print(f"Provider error: {exc}", file=sys.stderr)
        return 2

    all_results: list[dict[str, Any]] = []
    today = date.today()

    for idx, ticker in enumerate(tickers):
        try:
            spot_price = provider.get_spot_price(ticker)
            ticker_results = scan_ticker(provider, ticker, criteria, settings, today, spot_price=spot_price)
            all_results.extend(ticker_results)
        except DataProviderError as exc:
            print(f"[{ticker}] provider warning: {exc}", file=sys.stderr)
        except Exception as exc:  # pragma: no cover - defensive safety net
            print(f"[{ticker}] unexpected error: {exc}", file=sys.stderr)

        if idx < len(tickers) - 1:
            time.sleep(RATE_LIMIT_SECONDS)

    all_results.sort(key=lambda row: (row["ticker"], -row["roiw_pct"]))
    print_results(all_results)

    if settings.output_csv:
        try:
            write_csv(settings.output_csv, all_results)
            print(f"\nSaved CSV: {settings.output_csv}")
        except Exception as exc:
            print(f"Failed to write CSV ({settings.output_csv}): {exc}", file=sys.stderr)

    print(f"\nSummary: {len(all_results)} contracts found matching criteria across {len(tickers)} tickers")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
