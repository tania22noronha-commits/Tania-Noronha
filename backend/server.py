"""Personal AI Stock Market Copilot - FastAPI backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Body
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, date

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import market_data as md
import ai_engine as ai
import premium_data as pd

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="AI Stock Market Copilot")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
log = logging.getLogger(__name__)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_str() -> str:
    return date.today().isoformat()


# ===================== Models =====================

class WatchlistItem(BaseModel):
    symbol: str

class Holding(BaseModel):
    symbol: str
    shares: float
    avg_price: float

class PortfolioReq(BaseModel):
    holdings: List[Holding]

class AlertItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    kind: str  # "recommendation_change" | "major_news" | "risk_up" | "portfolio_imbalance"
    title: str
    body: str
    symbol: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    read: bool = False


# ===================== Helpers =====================

def _universe(market: str) -> List[str]:
    if market == "in":
        return md.INDIAN_LARGECAPS
    if market == "us":
        return md.US_LARGECAPS
    return md.US_LARGECAPS + md.INDIAN_LARGECAPS  # both


async def _cache_get(key: str, ttl_minutes: int = 30) -> Optional[dict]:
    row = await db.cache.find_one({"_id": key})
    if not row:
        return None
    ts = row["ts"]
    # Motor returns naive UTC datetimes by default; normalize to aware
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    age = (datetime.now(timezone.utc) - ts).total_seconds() / 60
    if age > ttl_minutes:
        return None
    return row.get("data")


async def _cache_set(key: str, data: dict):
    await db.cache.update_one(
        {"_id": key},
        {"$set": {"data": data, "ts": datetime.now(timezone.utc)}},
        upsert=True,
    )


async def _record_alert(kind: str, title: str, body: str, symbol: Optional[str] = None):
    alert = AlertItem(kind=kind, title=title, body=body, symbol=symbol)
    await db.alerts.insert_one(alert.dict())


# ===================== Routes =====================

@api.get("/")
async def root():
    return {"name": "AI Stock Market Copilot", "ok": True}


@api.get("/dashboard")
async def dashboard(market: str = "both"):
    cache_key = f"dashboard:{market}"
    cached = await _cache_get(cache_key, ttl_minutes=10)
    if cached:
        return cached

    indexes = md.fetch_indexes()
    universe = _universe(market)
    quotes = md.fetch_quotes(universe)
    sentiment = md.compute_market_sentiment(indexes, quotes)
    ranked = md.rank_opportunities(quotes)

    # Plain English market summary via AI
    summary_data = {"summary": "", "tone": "neutral"}
    try:
        idx_text = ", ".join([f"{i['display_name']} {i['change_pct']:+.2f}%" for i in indexes])
        sectors_up = {}
        sectors_down = {}
        for q in quotes:
            sec = q.get("sector", "Unknown")
            if q["change_pct"] > 0:
                sectors_up[sec] = sectors_up.get(sec, 0) + 1
            elif q["change_pct"] < 0:
                sectors_down[sec] = sectors_down.get(sec, 0) + 1
        top_up = sorted(sectors_up.items(), key=lambda x: -x[1])[:3]
        top_dn = sorted(sectors_down.items(), key=lambda x: -x[1])[:3]
        chat = ai._new_chat("dash-summary",
                            "You write 2-sentence plain-English market summaries. Output only the sentences, no JSON.")
        from emergentintegrations.llm.chat import UserMessage
        prompt = (f"Sentiment score: {sentiment}/100. Indexes: {idx_text}. "
                  f"Sectors strong: {', '.join(s for s,_ in top_up)}. "
                  f"Sectors weak: {', '.join(s for s,_ in top_dn)}. "
                  f"Write a 2-sentence market mood summary for a private investor.")
        text = await chat.send_message(UserMessage(text=prompt))
        summary_data["summary"] = (text if isinstance(text, str) else str(text)).strip()
    except Exception as e:
        log.warning(f"dashboard summary failed: {e}")
        summary_data["summary"] = f"Sentiment is {sentiment}/100. Watching the major movers today."

    result = {
        "as_of": now_iso(),
        "sentiment_score": sentiment,
        "indexes": indexes,
        "top_buy": ranked["top_buy"],
        "top_sell": ranked["top_sell"],
        "summary": summary_data["summary"],
    }
    await _cache_set(cache_key, result)
    return result


@api.get("/quote/{symbol}")
async def quote(symbol: str):
    sym = symbol.upper()
    q = md.fetch_quote(sym)
    # If Yahoo Finance has no data, fall back to Alpha Vantage Global Quote
    if not q:
        av = pd.alpha_global_quote(sym)
        if av:
            q = {
                "symbol": sym, "name": sym,
                "price": av["price"], "change": av["change"], "change_pct": av["change_pct"],
                "currency": "USD", "sector": "Unknown", "industry": "Unknown",
                "volume": av.get("volume"), "avg_volume": None, "market_cap": None,
                "pe_ratio": None, "fifty_two_week_high": None, "fifty_two_week_low": None,
                "day_high": None, "day_low": None, "dividend_yield": None, "beta": None,
                "analyst_recommendation": None, "target_mean_price": None, "earnings_growth": None,
            }
    if not q:
        raise HTTPException(404, f"No data for {symbol}")
    return q


@api.get("/stock/{symbol}/premium")
async def stock_premium(symbol: str):
    """Premium add-on data: analyst targets, recs breakdown, earnings, insiders, intraday."""
    sym = symbol.upper()
    cache_key = f"premium:{sym}"
    cached = await _cache_get(cache_key, ttl_minutes=60)
    if cached:
        return cached

    bundle = pd.get_premium_bundle(sym)
    # Intraday is more rate-limited (AV 25/day) — fetch lazily only when requested.
    bundle["intraday_available"] = pd.alpha_vantage_enabled()
    await _cache_set(cache_key, bundle)
    return bundle


@api.get("/stock/{symbol}/intraday")
async def stock_intraday(symbol: str, interval: str = "5min"):
    """Alpha Vantage intraday quotes — helpful for Indian symbols where Yahoo lags."""
    sym = symbol.upper()
    if not pd.alpha_vantage_enabled():
        return {"enabled": False, "rows": []}
    rows = pd.alpha_intraday(sym, interval) or []
    return {"enabled": True, "interval": interval, "rows": rows}


@api.get("/stock/{symbol}/analyze")
async def stock_analyze(symbol: str):
    symbol = symbol.upper()
    cache_key = f"analyze:{symbol}"
    cached = await _cache_get(cache_key, ttl_minutes=60)
    if cached:
        return cached

    q = md.fetch_quote(symbol)
    if not q:
        # Try Alpha Vantage fallback
        av = pd.alpha_global_quote(symbol)
        if av:
            q = {
                "symbol": symbol, "name": symbol, "price": av["price"],
                "change": av["change"], "change_pct": av["change_pct"],
                "currency": "USD", "sector": "Unknown", "industry": "Unknown",
                "volume": av.get("volume"), "avg_volume": None, "market_cap": None,
                "pe_ratio": None, "fifty_two_week_high": None, "fifty_two_week_low": None,
                "day_high": None, "day_low": None, "dividend_yield": None, "beta": None,
                "analyst_recommendation": None, "target_mean_price": None, "earnings_growth": None,
            }
    if not q:
        raise HTTPException(404, f"No data for {symbol}")
    news = md.fetch_news(symbol, limit=8)
    premium = pd.get_premium_bundle(symbol)
    analysis = await ai.analyze_stock(q, news, premium=premium)

    # Track recommendation changes -> alerts
    prev = await db.recommendations.find_one({"_id": symbol})
    if analysis.get("recommendation"):
        if prev and prev.get("recommendation") != analysis["recommendation"]:
            await _record_alert(
                "recommendation_change",
                f"{symbol}: {prev['recommendation']} → {analysis['recommendation']}",
                analysis.get("summary", ""),
                symbol,
            )
        await db.recommendations.update_one(
            {"_id": symbol},
            {"$set": {"recommendation": analysis["recommendation"],
                      "confidence": analysis.get("confidence"),
                      "ts": datetime.now(timezone.utc)}},
            upsert=True,
        )

    # Persist a daily snapshot for the "What changed since yesterday" timeline.
    # One snapshot per (symbol, date) — re-running analyze the same day overwrites.
    try:
        snap = {
            "symbol": symbol,
            "date": today_str(),
            "price": q.get("price"),
            "change_pct": q.get("change_pct"),
            "recommendation": analysis.get("recommendation"),
            "confidence": analysis.get("confidence"),
            "summary": analysis.get("summary"),
            "key_risks": analysis.get("key_risks", []),
            "key_opportunities": analysis.get("key_opportunities", []),
            "news_count": len(news),
            "ts": datetime.now(timezone.utc),
        }
        await db.snapshots.update_one(
            {"symbol": symbol, "date": snap["date"]},
            {"$set": snap},
            upsert=True,
        )
    except Exception as e:
        log.warning(f"snapshot save failed for {symbol}: {e}")

    result = {"quote": q, "news": news, "analysis": analysis, "premium": premium}
    await _cache_set(cache_key, result)
    return result


@api.get("/stock/{symbol}/timeline")
async def stock_timeline(symbol: str, days: int = 7):
    """Return what changed since yesterday + N-day history for a stock."""
    symbol = symbol.upper()
    rows = await db.snapshots.find(
        {"symbol": symbol}, {"_id": 0}
    ).sort("date", -1).limit(max(days, 2)).to_list(max(days, 2))

    history = []
    for r in rows:
        # ts may be datetime — convert to iso string for JSON safety
        if isinstance(r.get("ts"), datetime):
            r["ts"] = r["ts"].isoformat()
        history.append(r)

    diff: Dict[str, Any] = {}
    if len(history) >= 2:
        today = history[0]
        prev = history[1]

        rec_changed = today.get("recommendation") != prev.get("recommendation")
        price_delta = None
        if today.get("price") is not None and prev.get("price") not in (None, 0):
            price_delta = round(
                (today["price"] - prev["price"]) / prev["price"] * 100, 2
            )

        conf_delta = None
        if today.get("confidence") is not None and prev.get("confidence") is not None:
            conf_delta = today["confidence"] - prev["confidence"]

        prev_risks = set(prev.get("key_risks", []) or [])
        today_risks = set(today.get("key_risks", []) or [])
        new_risks = list(today_risks - prev_risks)
        dropped_risks = list(prev_risks - today_risks)

        prev_opps = set(prev.get("key_opportunities", []) or [])
        today_opps = set(today.get("key_opportunities", []) or [])
        new_opps = list(today_opps - prev_opps)

        diff = {
            "has_previous": True,
            "prev_date": prev.get("date"),
            "today_date": today.get("date"),
            "recommendation_changed": rec_changed,
            "prev_recommendation": prev.get("recommendation"),
            "today_recommendation": today.get("recommendation"),
            "prev_confidence": prev.get("confidence"),
            "today_confidence": today.get("confidence"),
            "confidence_delta": conf_delta,
            "prev_price": prev.get("price"),
            "today_price": today.get("price"),
            "price_delta_pct": price_delta,
            "new_risks": new_risks,
            "dropped_risks": dropped_risks,
            "new_opportunities": new_opps,
        }
    else:
        diff = {"has_previous": False}

    return {"symbol": symbol, "diff": diff, "history": history}


@api.get("/news")
async def news_endpoint(symbol: Optional[str] = None):
    cache_key = f"news:{symbol or 'market'}"
    cached = await _cache_get(cache_key, ttl_minutes=20)
    if cached:
        return cached

    items = md.fetch_news(symbol.upper() if symbol else None, limit=20)
    summary = await ai.summarize_news(items, context=symbol or "the broader market")
    result = {"items": items, "summary": summary}
    await _cache_set(cache_key, result)
    return result


@api.get("/scanner")
async def scanner(market: str = "both"):
    cache_key = f"scanner:{market}"
    cached = await _cache_get(cache_key, ttl_minutes=15)
    if cached:
        return cached
    universe = _universe(market)
    quotes = md.fetch_quotes(universe)
    opportunities = md.scan_opportunities(quotes)
    result = {"as_of": now_iso(), "opportunities": opportunities}
    await _cache_set(cache_key, result)
    return result


@api.get("/briefing")
async def briefing(market: str = "both", force: bool = False):
    key = f"briefing:{market}:{today_str()}"
    if not force:
        cached = await _cache_get(key, ttl_minutes=24 * 60)
        if cached:
            return cached

    indexes = md.fetch_indexes()
    quotes = md.fetch_quotes(_universe(market))
    sentiment = md.compute_market_sentiment(indexes, quotes)
    ranked = md.rank_opportunities(quotes)
    news = md.fetch_news(None, limit=12)
    brief = await ai.daily_briefing(indexes, ranked["top_buy"], ranked["top_sell"], news, sentiment)

    result = {
        "date": today_str(),
        "as_of": now_iso(),
        "sentiment_score": sentiment,
        "indexes": indexes,
        "briefing": brief,
    }
    await _cache_set(key, result)
    return result


# ---- Watchlist ----

@api.get("/watchlist")
async def get_watchlist():
    rows = await db.watchlist.find({}, {"_id": 0}).to_list(500)
    if not rows:
        return {"items": []}
    quotes = md.fetch_quotes([r["symbol"] for r in rows])
    quote_map = {q["symbol"]: q for q in quotes}
    items = []
    for r in rows:
        q = quote_map.get(r["symbol"])
        if not q:
            continue
        rec = await db.recommendations.find_one({"_id": r["symbol"]}, {"_id": 0})
        items.append({**q, "recommendation": (rec or {}).get("recommendation"),
                      "confidence": (rec or {}).get("confidence")})
    return {"items": items}


@api.post("/watchlist")
async def add_watchlist(item: WatchlistItem):
    sym = item.symbol.upper()
    q = md.fetch_quote(sym)
    if not q:
        raise HTTPException(404, f"No data for {sym}")
    await db.watchlist.update_one({"symbol": sym}, {"$set": {"symbol": sym}}, upsert=True)
    return {"ok": True, "symbol": sym}


@api.delete("/watchlist/{symbol}")
async def remove_watchlist(symbol: str):
    await db.watchlist.delete_one({"symbol": symbol.upper()})
    return {"ok": True}


# ---- Portfolio ----

@api.get("/portfolio")
async def get_portfolio():
    rows = await db.portfolio.find({}, {"_id": 0}).to_list(500)
    if not rows:
        return {"holdings": [], "total_value": 0, "total_cost": 0, "total_pl": 0}
    quotes = md.fetch_quotes([r["symbol"] for r in rows])
    qmap = {q["symbol"]: q for q in quotes}
    holdings = []
    total_value = 0.0
    total_cost = 0.0
    for r in rows:
        q = qmap.get(r["symbol"])
        if not q:
            continue
        value = q["price"] * r["shares"]
        cost = r["avg_price"] * r["shares"]
        total_value += value
        total_cost += cost
        holdings.append({
            "symbol": r["symbol"],
            "shares": r["shares"],
            "avg_price": r["avg_price"],
            "current_price": q["price"],
            "change_pct": q["change_pct"],
            "value": round(value, 2),
            "cost": round(cost, 2),
            "pl": round(value - cost, 2),
            "pl_pct": round(((value - cost) / cost * 100) if cost else 0, 2),
            "sector": q.get("sector", "Unknown"),
            "name": q.get("name"),
        })
    return {
        "holdings": holdings,
        "total_value": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "total_pl": round(total_value - total_cost, 2),
        "total_pl_pct": round(((total_value - total_cost) / total_cost * 100) if total_cost else 0, 2),
    }


@api.post("/portfolio")
async def add_holding(h: Holding):
    sym = h.symbol.upper()
    q = md.fetch_quote(sym)
    if not q:
        raise HTTPException(404, f"No data for {sym}")
    # If exists, average; else insert
    existing = await db.portfolio.find_one({"symbol": sym})
    if existing:
        new_shares = existing["shares"] + h.shares
        new_avg = (existing["shares"] * existing["avg_price"] + h.shares * h.avg_price) / new_shares
        await db.portfolio.update_one(
            {"symbol": sym},
            {"$set": {"shares": new_shares, "avg_price": round(new_avg, 4)}},
        )
    else:
        await db.portfolio.insert_one({"symbol": sym, "shares": h.shares,
                                       "avg_price": h.avg_price})
    return {"ok": True}


@api.delete("/portfolio/{symbol}")
async def delete_holding(symbol: str):
    await db.portfolio.delete_one({"symbol": symbol.upper()})
    return {"ok": True}


@api.get("/portfolio/analysis")
async def portfolio_analysis():
    cache_key = f"portfolio-analysis:{today_str()}"
    cached = await _cache_get(cache_key, ttl_minutes=60)
    if cached:
        return cached

    p = await get_portfolio()
    if not p["holdings"]:
        return {"analysis": {}, "portfolio": p}

    analysis = await ai.analyze_portfolio(p["holdings"])

    # Concentration alert
    try:
        total = p["total_value"] or 1
        for h in p["holdings"]:
            if h["value"] / total > 0.35:
                await _record_alert(
                    "portfolio_imbalance",
                    f"Concentration risk: {h['symbol']}",
                    f"{h['symbol']} is {h['value']/total*100:.0f}% of your portfolio.",
                    h["symbol"],
                )
                break
    except Exception:
        pass

    result = {"analysis": analysis, "portfolio": p}
    await _cache_set(cache_key, result)
    return result


# ---- Alerts ----

@api.get("/alerts")
async def get_alerts():
    rows = await db.alerts.find({}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return {"items": rows}


@api.post("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: str):
    await db.alerts.update_one({"id": alert_id}, {"$set": {"read": True}})
    return {"ok": True}


@api.delete("/alerts")
async def clear_alerts():
    await db.alerts.delete_many({})
    return {"ok": True}


# ---- Search ----

@api.get("/search")
async def search(q: str):
    """Best-effort symbol search via yfinance Lookup."""
    q = (q or "").strip()
    if not q:
        return {"results": []}
    try:
        import yfinance as yf
        results = []
        # Try the search API
        try:
            search_obj = yf.Search(q, max_results=8)
            for r in (search_obj.quotes or []):
                results.append({
                    "symbol": r.get("symbol"),
                    "name": r.get("shortname") or r.get("longname") or r.get("symbol"),
                    "exchange": r.get("exchDisp") or r.get("exchange", ""),
                    "type": r.get("quoteType", ""),
                })
        except Exception as e:
            log.warning(f"yf.Search failed: {e}")
        # Always include exact symbol match
        if not any(r.get("symbol", "").upper() == q.upper() for r in results):
            quote = md.fetch_quote(q.upper())
            if quote:
                results.insert(0, {
                    "symbol": quote["symbol"],
                    "name": quote["name"],
                    "exchange": "",
                    "type": "EQUITY",
                })
        return {"results": results[:10]}
    except Exception as e:
        log.warning(f"search failed: {e}")
        return {"results": []}


# Register
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
