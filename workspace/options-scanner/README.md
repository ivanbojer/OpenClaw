# Option Scanner

Python option chain scanner with provider abstraction, CLI controls, and YAML configuration.

## Features

- Provider-abstracted architecture (`DataProvider`) with a Yahoo Finance implementation (`YahooProvider`)
- CLI driven workflow with `argparse`
- YAML-based defaults with CLI override behavior
- Multi-ticker scanning across all expirations or filtered DTE window
- Black-Scholes absolute delta approximation using `scipy.stats.norm`
- ROI calculation and configurable filtering (delta/ROI/DTE/option type)
- Console table output (`tabulate`) and optional CSV export
- Graceful per-ticker error handling
- Rate limiting between ticker requests (0.5s)

## Project Structure

- `scanner.py` - main entry point + CLI + scan engine
- `providers/base.py` - abstract `DataProvider` and provider errors
- `providers/yahoo.py` - Yahoo provider (`yfinance`)
- `providers/__init__.py` - provider exports
- `criteria.yaml` - default configuration
- `requirements.txt` - Python dependencies

## Installation

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Usage

```bash
python scanner.py --config criteria.yaml
python scanner.py --tickers GME,MSTR,AMZN --option-type put --delta-min 0.15 --delta-max 0.25 --dte-min 30 --dte-max 45
python scanner.py --config criteria.yaml --output results.csv
```

## Configuration

Default `criteria.yaml`:

```yaml
tickers:
  - GME
  - MSTR
  - AMZN

criteria:
  option_type: put
  delta_min: 0.15
  delta_max: 0.25
  dte_min: 30
  dte_max: 45
  # roiw_min: optional
  # roiw_max: optional

settings:
  provider: yahoo
  risk_free_rate: 0.05
  default_iv: 0.30
  output_csv: results.csv
```

CLI arguments always override values from the config file.

## Output Columns

`ticker | expiration | strike | bid | ask | mid_price | last_price | implied_vol | delta | roiw_pct | dte | contract_symbol`

## Notes

- `mid_price` uses `(bid + ask) / 2` when both are available, otherwise falls back to `lastPrice`.
- Absolute delta is calculated from Black-Scholes approximation:
  - `d1 = (ln(S/K) + (r + 0.5*sigma^2)*T) / (sigma*sqrt(T))`
  - call delta `= N(d1)`
  - put delta `= N(d1) - 1`
  - scanner stores `abs(delta)` for filtering/output
- `sigma` uses option implied volatility when present, otherwise `default_iv`.
- Summary is printed at the end: matching contracts count across scanned tickers.
