"""Premium data sources: Alpha Vantage + Finnhub.

Both providers are OPTIONAL. If keys are missing or absent (placeholders),
every public function in this module returns an empty/None value so that the
rest of the app keeps working with Yahoo Finance as the baseline.
"""
import os
import logging
import time
from typing import Dict, List, Optional
import requests

log = logging.getLogger(__name__)

FINNHUB_KEY = os.environ.get("FINNHUB_KEY", "").strip()
ALPHA_VANTAGE_KEY = os.environ.get("ALPHA_VANTAGE_KEY", "").strip()

# Treat obvious placeholders as missing
PLACEHOLDER_VALUES = {"", "your_key", "YOUR_KEY", "XXXXXXXXXX", "YYYYYYYYYY"}


def finnhub_enabled() -> bool:
    return FINNHUB_KEY not in PLACEHOLDER_VALUES


def alpha_vantage_enabled() -> bool:
    return ALPHA_VANTAGE_KEY not in PLACEHOLDER_VALUES


# Simple in-process TTL cache so we don't burn through 25-req/day Alpha Vantage
# quota on repeat calls within a few minutes.
_cache: Dict[str, tuple] = {}


def _cached_get(key: str, ttl_seconds: int):
    entry = _cache.get(key)
    if not entry:
        return None
    ts, val = entry
    if time.time() - ts > ttl_seconds:
        _cache.pop(key, None)
        return None
    return val


def _cache_put(key: str, val):
    _cache[key] = (time.time(), val)


def _get(url: str, params: dict, timeout: float = 8.0) -> Optional[dict]:
    try:
        r = requests.get(url, params=params, timeout=timeout)
        if r.status_code != 200:
            log.warning(f"premium get {url} → {r.status_code}: {r.text[:160]}")
            return None
        return r.json()
    except Exception as e:
        log.warning(f"premium get {url} failed: {e}")
        return None


# ---------------------- FINNHUB ----------------------

FINNHUB_BASE = "https://finnhub.io/api/v1"


def finnhub_price_target(symbol: str) -> Optional[Dict]:
    """Analyst price targets (high, low, mean, median)."""
    if not finnhub_enabled():
        return None
    key = f"finnhub:pt:{symbol}"
    cached = _cached_get(key, 6 * 3600)
    if cached is not None:
        return cached
    data = _get(f"{FINNHUB_BASE}/stock/price-target",
                {"symbol": symbol, "token": FINNHUB_KEY})
    if not data or not data.get("targetMean"):
        result = None
    else:
        result = {
            "target_high": data.get("targetHigh"),
            "target_low": data.get("targetLow"),
            "target_mean": data.get("targetMean"),
            "target_median": data.get("targetMedian"),
            "last_updated": data.get("lastUpdated"),
        }
    _cache_put(key, result)
    return result


def finnhub_recommendation_trend(symbol: str) -> Optional[List[Dict]]:
    """Analyst recommendation breakdown: strong buy / buy / hold / sell / strong sell."""
    if not finnhub_enabled():
        return None
    key = f"finnhub:rec:{symbol}"
    cached = _cached_get(key, 6 * 3600)
    if cached is not None:
        return cached
    data = _get(f"{FINNHUB_BASE}/stock/recommendation",
                {"symbol": symbol, "token": FINNHUB_KEY})
    if not data:
        _cache_put(key, None)
        return None
    # Most recent first
    rows = sorted(data, key=lambda d: d.get("period", ""), reverse=True)
    result = [
        {
            "period": r.get("period"),
            "strong_buy": r.get("strongBuy", 0),
            "buy": r.get("buy", 0),
            "hold": r.get("hold", 0),
            "sell": r.get("sell", 0),
            "strong_sell": r.get("strongSell", 0),
        }
        for r in rows[:3]
    ]
    _cache_put(key, result)
    return result


def finnhub_earnings_calendar(symbol: str) -> Optional[Dict]:
    """Next earnings date for symbol — looks 90 days ahead."""
    if not finnhub_enabled():
        return None
    key = f"finnhub:earn:{symbol}"
    cached = _cached_get(key, 12 * 3600)
    if cached is not None:
        return cached
    from datetime import date, timedelta
    today = date.today().isoformat()
    until = (date.today() + timedelta(days=90)).isoformat()
    data = _get(f"{FINNHUB_BASE}/calendar/earnings",
                {"from": today, "to": until,
                 "symbol": symbol, "token": FINNHUB_KEY})
    rows = (data or {}).get("earningsCalendar") or []
    result = None
    if rows:
        # Take soonest
        rows.sort(key=lambda r: r.get("date") or "9999-12-31")
        n = rows[0]
        result = {
            "date": n.get("date"),
            "eps_estimate": n.get("epsEstimate"),
            "revenue_estimate": n.get("revenueEstimate"),
            "hour": n.get("hour"),
        }
    _cache_put(key, result)
    return result


def finnhub_insider_transactions(symbol: str, limit: int = 5) -> Optional[List[Dict]]:
    """Recent insider transactions. Positive `share_change` = insider buying."""
    if not finnhub_enabled():
        return None
    key = f"finnhub:ins:{symbol}"
    cached = _cached_get(key, 6 * 3600)
    if cached is not None:
        return cached
    data = _get(f"{FINNHUB_BASE}/stock/insider-transactions",
                {"symbol": symbol, "token": FINNHUB_KEY})
    rows = (data or {}).get("data") or []
    rows.sort(key=lambda r: r.get("transactionDate") or "", reverse=True)
    result = [
        {
            "name": r.get("name"),
            "share_change": r.get("change", 0),
            "transaction_date": r.get("transactionDate"),
            "transaction_price": r.get("transactionPrice"),
            "transaction_code": r.get("transactionCode"),
        }
        for r in rows[:limit]
    ]
    _cache_put(key, result if result else None)
    return result if result else None


def insider_summary(transactions: Optional[List[Dict]]) -> Optional[Dict]:
    """Summarize insider txns into a bullish/bearish signal."""
    if not transactions:
        return None
    buys = sum(t.get("share_change", 0) for t in transactions if (t.get("share_change") or 0) > 0)
    sells = sum(-t.get("share_change", 0) for t in transactions if (t.get("share_change") or 0) < 0)
    net = buys - sells
    if buys == 0 and sells == 0:
        signal = "NEUTRAL"
    elif net > 0 and buys > sells * 1.5:
        signal = "BULLISH"
    elif net < 0 and sells > buys * 1.5:
        signal = "BEARISH"
    else:
        signal = "MIXED"
    return {"buys_shares": buys, "sells_shares": sells, "net_shares": net, "signal": signal}


# ---------------------- ALPHA VANTAGE ----------------------

ALPHA_BASE = "https://www.alphavantage.co/query"


def alpha_intraday(symbol: str, interval: str = "5min") -> Optional[List[Dict]]:
    """Recent intraday quotes — useful for Indian symbols where Yahoo lags."""
    if not alpha_vantage_enabled():
        return None
    key = f"av:intra:{symbol}:{interval}"
    cached = _cached_get(key, 10 * 60)  # 10 min — free tier is 25/day
    if cached is not None:
        return cached
    data = _get(ALPHA_BASE, {
        "function": "TIME_SERIES_INTRADAY",
        "symbol": symbol,
        "interval": interval,
        "apikey": ALPHA_VANTAGE_KEY,
        "outputsize": "compact",
    }, timeout=12)
    if not data or data.get("Note") or data.get("Error Message"):
        _cache_put(key, None)
        return None
    series_key = f"Time Series ({interval})"
    series = data.get(series_key) or {}
    rows = []
    for ts, vals in list(series.items())[:60]:
        rows.append({
            "time": ts,
            "open": float(vals.get("1. open", 0)),
            "high": float(vals.get("2. high", 0)),
            "low": float(vals.get("3. low", 0)),
            "close": float(vals.get("4. close", 0)),
            "volume": int(vals.get("5. volume", 0)),
        })
    rows.sort(key=lambda r: r["time"])
    _cache_put(key, rows)
    return rows


def alpha_global_quote(symbol: str) -> Optional[Dict]:
    """Fallback quote — useful when Yahoo Finance is missing a symbol."""
    if not alpha_vantage_enabled():
        return None
    key = f"av:gq:{symbol}"
    cached = _cached_get(key, 10 * 60)
    if cached is not None:
        return cached
    data = _get(ALPHA_BASE, {
        "function": "GLOBAL_QUOTE",
        "symbol": symbol,
        "apikey": ALPHA_VANTAGE_KEY,
    })
    q = (data or {}).get("Global Quote") or {}
    if not q:
        _cache_put(key, None)
        return None
    try:
        result = {
            "symbol": q.get("01. symbol"),
            "price": float(q.get("05. price", 0)),
            "change": float(q.get("09. change", 0)),
            "change_pct": float((q.get("10. change percent") or "0").rstrip("%")),
            "volume": int(q.get("06. volume") or 0),
        }
    except Exception as e:
        log.warning(f"AV global quote parse failed for {symbol}: {e}")
        result = None
    _cache_put(key, result)
    return result


# ---------------------- AGGREGATOR ----------------------

def get_premium_bundle(symbol: str) -> Dict:
    """One-shot fetch: everything premium we know about a stock.
    Returns a flat dict with None values where data isn't available.
    """
    pt = finnhub_price_target(symbol)
    rec = finnhub_recommendation_trend(symbol)
    earn = finnhub_earnings_calendar(symbol)
    insiders = finnhub_insider_transactions(symbol)
    insider_sig = insider_summary(insiders)

    return {
        "providers_enabled": {
            "finnhub": finnhub_enabled(),
            "alpha_vantage": alpha_vantage_enabled(),
        },
        "price_target": pt,
        "recommendation_trend": rec,
        "next_earnings": earn,
        "insider_transactions": insiders,
        "insider_signal": insider_sig,
    }
