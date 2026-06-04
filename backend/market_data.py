"""Market data fetching using yfinance (free, no API key)."""
import yfinance as yf
from typing import Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor
import logging

logger = logging.getLogger(__name__)

# Curated lists for the "private investor" experience
US_LARGECAPS = ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA", "JPM",
                "V", "WMT", "JNJ", "PG", "XOM", "BAC", "HD", "MA", "DIS", "NFLX",
                "AMD", "INTC", "CRM", "PFE", "KO", "PEP", "T"]

INDIAN_LARGECAPS = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
                    "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
                    "LT.NS", "AXISBANK.NS", "WIPRO.NS", "MARUTI.NS", "TATAMOTORS.NS"]

INDEXES = {
    "S&P 500": "^GSPC",
    "NASDAQ": "^IXIC",
    "Dow Jones": "^DJI",
    "NIFTY 50": "^NSEI",
    "SENSEX": "^BSESN",
}


def _safe_get(d, key, default=None):
    val = d.get(key)
    if val is None:
        return default
    return val


def fetch_quote(symbol: str) -> Optional[Dict]:
    """Fetch a single quote with price, change, sector, etc."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info or {}
        # Some symbols return very small info dicts when invalid
        price = _safe_get(info, "regularMarketPrice") or _safe_get(info, "currentPrice")
        if price is None:
            # Fallback to history
            hist = ticker.history(period="2d")
            if hist.empty:
                return None
            price = float(hist["Close"].iloc[-1])
            prev = float(hist["Close"].iloc[-2]) if len(hist) > 1 else price
        else:
            prev = _safe_get(info, "previousClose", price)

        change = price - prev
        change_pct = (change / prev * 100.0) if prev else 0.0

        return {
            "symbol": symbol,
            "name": _safe_get(info, "shortName") or _safe_get(info, "longName") or symbol,
            "price": round(float(price), 2),
            "change": round(float(change), 2),
            "change_pct": round(float(change_pct), 2),
            "currency": _safe_get(info, "currency", "USD"),
            "sector": _safe_get(info, "sector", "Unknown"),
            "industry": _safe_get(info, "industry", "Unknown"),
            "market_cap": _safe_get(info, "marketCap"),
            "pe_ratio": _safe_get(info, "trailingPE"),
            "fifty_two_week_high": _safe_get(info, "fiftyTwoWeekHigh"),
            "fifty_two_week_low": _safe_get(info, "fiftyTwoWeekLow"),
            "volume": _safe_get(info, "volume"),
            "avg_volume": _safe_get(info, "averageVolume"),
            "day_high": _safe_get(info, "dayHigh"),
            "day_low": _safe_get(info, "dayLow"),
            "dividend_yield": _safe_get(info, "dividendYield"),
            "beta": _safe_get(info, "beta"),
            "analyst_recommendation": _safe_get(info, "recommendationKey"),
            "target_mean_price": _safe_get(info, "targetMeanPrice"),
            "earnings_growth": _safe_get(info, "earningsGrowth"),
        }
    except Exception as e:
        logger.warning(f"fetch_quote failed for {symbol}: {e}")
        return None


def fetch_quotes(symbols: List[str]) -> List[Dict]:
    """Fetch multiple quotes in parallel."""
    with ThreadPoolExecutor(max_workers=10) as ex:
        results = list(ex.map(fetch_quote, symbols))
    return [r for r in results if r]


def fetch_indexes() -> List[Dict]:
    """Fetch major market indexes."""
    rows = []
    for name, sym in INDEXES.items():
        q = fetch_quote(sym)
        if q:
            q["display_name"] = name
            rows.append(q)
    return rows


def fetch_news(symbol: Optional[str] = None, limit: int = 15) -> List[Dict]:
    """Fetch news. If symbol is None, fetch market-wide news from major tickers."""
    items: List[Dict] = []
    seen_titles = set()
    try:
        if symbol:
            ticker = yf.Ticker(symbol)
            raw_news = ticker.news or []
        else:
            # Aggregate news from a few large symbols
            raw_news = []
            for sym in ["SPY", "QQQ", "AAPL", "MSFT", "NVDA"]:
                try:
                    raw_news.extend(yf.Ticker(sym).news or [])
                except Exception:
                    continue

        for n in raw_news:
            # yfinance changed shape; normalize both old & new
            content = n.get("content") or n
            title = content.get("title") or n.get("title")
            if not title or title in seen_titles:
                continue
            seen_titles.add(title)

            publisher = (
                content.get("provider", {}).get("displayName")
                if isinstance(content.get("provider"), dict)
                else content.get("publisher") or n.get("publisher")
            )
            link = (
                content.get("canonicalUrl", {}).get("url")
                if isinstance(content.get("canonicalUrl"), dict)
                else content.get("link") or n.get("link")
            )
            summary = content.get("summary") or content.get("description") or ""
            pub_date = content.get("pubDate") or n.get("providerPublishTime") or ""

            items.append({
                "title": title,
                "publisher": publisher or "Unknown",
                "link": link or "",
                "summary": summary[:500] if summary else "",
                "published": str(pub_date),
                "related_symbol": symbol or "",
            })
            if len(items) >= limit:
                break
    except Exception as e:
        logger.warning(f"fetch_news failed: {e}")
    return items


def compute_market_sentiment(indexes: List[Dict], quotes: List[Dict]) -> int:
    """Compute a 0-100 sentiment score from index + quote moves."""
    if not indexes and not quotes:
        return 50

    moves = []
    # Indexes weighted more heavily
    for ix in indexes:
        moves.extend([ix["change_pct"]] * 3)
    for q in quotes:
        moves.append(q["change_pct"])

    if not moves:
        return 50

    avg = sum(moves) / len(moves)
    # Map avg move (-3% to +3%) onto 0-100
    score = 50 + (avg * 100 / 6)
    return max(0, min(100, int(round(score))))


def rank_opportunities(quotes: List[Dict]) -> Dict[str, List[Dict]]:
    """Rank quotes into top-buy and top-sell candidates."""
    scored = []
    for q in quotes:
        score = 0.0
        # Momentum
        score += q["change_pct"] * 2
        # Volume surge
        if q.get("volume") and q.get("avg_volume") and q["avg_volume"] > 0:
            vol_ratio = q["volume"] / q["avg_volume"]
            score += min((vol_ratio - 1) * 5, 15)
        # Analyst target upside
        if q.get("target_mean_price") and q.get("price"):
            upside = (q["target_mean_price"] - q["price"]) / q["price"] * 100
            score += min(max(upside / 2, -10), 20)
        # Earnings growth
        if q.get("earnings_growth"):
            score += min(q["earnings_growth"] * 10, 10)
        scored.append((score, q))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_buy = [{"score": round(s, 1), **q} for s, q in scored[:5] if s > 0]
    top_sell = [{"score": round(s, 1), **q} for s, q in scored[-5:] if s < 0]
    top_sell.reverse()  # worst first
    return {"top_buy": top_buy, "top_sell": top_sell}


def scan_opportunities(quotes: List[Dict]) -> List[Dict]:
    """Build the Opportunity Scanner ranking with reasons."""
    out = []
    for q in quotes:
        reasons = []
        score = 0.0

        if q.get("volume") and q.get("avg_volume") and q["avg_volume"] > 0:
            vol_ratio = q["volume"] / q["avg_volume"]
            if vol_ratio > 1.5:
                reasons.append(f"Unusual volume ({vol_ratio:.1f}x avg)")
                score += min((vol_ratio - 1) * 8, 20)

        if q["change_pct"] > 2:
            reasons.append(f"Strong momentum (+{q['change_pct']:.1f}%)")
            score += q["change_pct"] * 2
        elif q["change_pct"] < -2:
            reasons.append(f"Sharp decline ({q['change_pct']:.1f}%)")

        if q.get("target_mean_price") and q.get("price"):
            upside = (q["target_mean_price"] - q["price"]) / q["price"] * 100
            if upside > 10:
                reasons.append(f"Analyst upside +{upside:.0f}%")
                score += min(upside / 2, 20)

        if q.get("earnings_growth") and q["earnings_growth"] > 0.15:
            reasons.append(f"Earnings growth +{q['earnings_growth']*100:.0f}%")
            score += 10

        if q.get("analyst_recommendation") in ("buy", "strong_buy"):
            reasons.append(f"Analysts: {q['analyst_recommendation'].replace('_', ' ').title()}")
            score += 8

        if reasons:
            out.append({
                "symbol": q["symbol"],
                "name": q["name"],
                "price": q["price"],
                "change_pct": q["change_pct"],
                "sector": q["sector"],
                "score": round(score, 1),
                "reasons": reasons,
            })

    out.sort(key=lambda x: x["score"], reverse=True)
    return out[:15]
