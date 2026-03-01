import yfinance as yf
import pandas as pd
import numpy as np
from scipy.stats import norm
from datetime import datetime, timedelta
import argparse

def black_scholes_delta(S, K, T, r, sigma, option_type):
    """
    Calculate Black-Scholes delta.
    S: Spot price
    K: Strike price
    T: Time to expiration (years)
    r: Risk-free interest rate
    sigma: Volatility (decimal)
    option_type: 'call' or 'put'
    """
    if T <= 0 or sigma <= 0:
        return 0.0
    
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    
    if option_type == 'call':
        delta = norm.cdf(d1)
    else:
        delta = norm.cdf(d1) - 1
        
    return delta

def get_option_chain(ticker, min_days=0, max_days=60):
    """
    Fetch option chain for a ticker within a date range.
    """
    stock = yf.Ticker(ticker)
    
    # Get current price
    try:
        current_price = stock.history(period="1d")['Close'].iloc[-1]
    except IndexError:
        print(f"Error: Could not fetch price for {ticker}")
        return pd.DataFrame(), 0.0

    print(f"Current price for {ticker}: ${current_price:.2f}")

    expirations = stock.options
    all_options = []
    
    today = datetime.now().date()
    
    for exp_date_str in expirations:
        exp_date = datetime.strptime(exp_date_str, "%Y-%m-%d").date()
        days_to_expiry = (exp_date - today).days
        
        if days_to_expiry < min_days or days_to_expiry > max_days:
            continue
            
        print(f"Fetching chain for {exp_date_str} ({days_to_expiry} days)...")
        
        try:
            opt = stock.option_chain(exp_date_str)
            calls = opt.calls
            puts = opt.puts
            
            calls['optionType'] = 'call'
            puts['optionType'] = 'put'
            
            calls['expirationDate'] = exp_date_str
            puts['expirationDate'] = exp_date_str
            calls['daysToExpiry'] = days_to_expiry
            puts['daysToExpiry'] = days_to_expiry
            
            all_options.append(calls)
            all_options.append(puts)
        except Exception as e:
            print(f"Failed to fetch {exp_date_str}: {e}")
            continue
            
    if not all_options:
        return pd.DataFrame(), current_price
        
    return pd.concat(all_options, ignore_index=True), current_price

def scan_options(ticker, option_type, target_delta, delta_tolerance, min_roc, max_days):
    print(f"Scanning {ticker} for {option_type}s with Delta ~{target_delta} and Min ROC {min_roc}%...")
    
    df, current_price = get_option_chain(ticker, max_days=max_days)
    
    if df.empty:
        print("No options found.")
        return

    # Filter by type
    df = df[df['optionType'] == option_type.lower()]
    
    # Calculate ROC (Return on Capital) = Price / Strike (simplified, usually for selling puts/calls)
    # If buying, it's just price/strike ratio. Let's assume standard ROC definition: Premium / Strike * 100
    # Use 'lastPrice' or 'bid'/'ask' average. Let's use mid price if available, else lastPrice.
    
    df['midPrice'] = (df['bid'] + df['ask']) / 2
    df['price'] = np.where(df['midPrice'] > 0, df['midPrice'], df['lastPrice'])
    
    # ROC Calculation: (Premium / Strike) * 100
    # For a cash-secured put, capital is Strike * 100 (minus premium, technically, but Strike is safe approx)
    # For a covered call, capital is roughly stock price, but usually calculated against strike or cost basis.
    # We will use Premium / Strike as requested: "Option Price / Strike Price %"
    
    df['roc'] = (df['price'] / df['strike']) * 100
    
    # Calculate Delta
    # Risk-free rate assumption: 4.5%
    r = 0.045
    
    # Calculate Time in years
    df['T'] = df['daysToExpiry'] / 365.0
    
    # Calculate Delta row-by-row
    df['T'] = df['daysToExpiry'] / 365.0
    
    # Calculate d1 vectorized
    # d1 = (ln(S/K) + (r + 0.5*sigma^2)T) / (sigma*sqrt(T))
    
    # Avoid log(0) or divide by zero
    df = df[df['impliedVolatility'] > 0.001].copy()
    
    sigma = df['impliedVolatility']
    K = df['strike']
    T = df['T']
    S = current_price
    
    # Check for T=0 to avoid division by zero
    T = T.replace(0, 0.0001)

    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    
    if option_type.lower() == 'call':
        df['calc_delta'] = norm.cdf(d1)
    else:
        df['calc_delta'] = norm.cdf(d1) - 1

    # Filter logic
    target = target_delta
    if option_type.lower() == 'put':
        # If user gave positive delta for put (e.g. 0.30), convert to negative (-0.30)
        if target > 0:
            target = -target
            
    lower = target - delta_tolerance
    upper = target + delta_tolerance
    
    print(f"Filtering for Delta between {lower:.3f} and {upper:.3f} with min ROC {min_roc}%")
    
    matches = df[
        (df['calc_delta'] >= lower) & 
        (df['calc_delta'] <= upper) &
        ((df['price'] / df['strike'] * 100) >= min_roc)
    ].copy()
    
    # Format for output
    matches['formatted_delta'] = matches['calc_delta'].round(3)
    matches['formatted_roc'] = matches['roc'].round(2)
    matches['formatted_price'] = matches['price'].round(2)
    
    output_cols = ['contractSymbol', 'expirationDate', 'strike', 'formatted_price', 'formatted_roc', 'formatted_delta', 'impliedVolatility', 'volume', 'openInterest']
    
    print(f"\nFound {len(matches)} candidates:\n")
    if not matches.empty:
        # Sort by ROC descending
        matches = matches.sort_values(by='roc', ascending=False)
        print(matches[output_cols].to_string(index=False))
        
        # Save to CSV
        filename = f"{ticker}_{option_type}_options.csv"
        matches[output_cols].to_csv(filename, index=False)
        print(f"\nSaved to {filename}")
    else:
        print("No matches found with current criteria.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scan options for specific criteria.")
    parser.add_argument("ticker", type=str, help="Stock ticker (e.g. AAPL)")
    parser.add_argument("--type", type=str, choices=['call', 'put'], required=True, help="Option type (call/put)")
    parser.add_argument("--delta", type=float, required=True, help="Target Delta (e.g. 0.30). Use positive for Put magnitude.")
    parser.add_argument("--tolerance", type=float, default=0.05, help="Delta tolerance (default 0.05)")
    parser.add_argument("--min_roc", type=float, default=1.0, help="Minimum ROC % (Price/Strike)")
    parser.add_argument("--days", type=int, default=45, help="Max days to expiration")
    
    args = parser.parse_args()
    
    scan_options(args.ticker, args.type, args.delta, args.tolerance, args.min_roc, args.days)
