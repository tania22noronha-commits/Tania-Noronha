"""Backend tests for Personal AI Stock Market Copilot.

Covers:
- Health & dashboard
- Quotes (valid + invalid)
- Stock analysis (AI-generated BUY/HOLD/SELL)
- News & summarization
- Opportunity scanner & daily briefing
- Symbol search
- Watchlist CRUD
- Portfolio CRUD + AI analysis
- Recommendation-change alert flow
"""
import time
import pytest

# Long timeout because AI endpoints take 5-30s
TIMEOUT = 90
AI_TIMEOUT = 120


# --------- Health ---------
class TestHealth:
    def test_root(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/", timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True


# --------- Dashboard ---------
class TestDashboard:
    def test_dashboard_us(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/dashboard", params={"market": "us"}, timeout=AI_TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data.get("sentiment_score"), int)
        assert 0 <= data["sentiment_score"] <= 100
        assert isinstance(data.get("indexes"), list) and len(data["indexes"]) > 0
        assert isinstance(data.get("top_buy"), list)
        assert isinstance(data.get("top_sell"), list)
        assert isinstance(data.get("summary"), str) and len(data["summary"]) > 0

    def test_dashboard_both(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/dashboard", params={"market": "both"}, timeout=AI_TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert 0 <= data["sentiment_score"] <= 100
        symbols = [q["symbol"] for q in (data.get("top_buy") or []) + (data.get("top_sell") or [])]
        # Should at least include US & potentially Indian symbols when present in universe
        assert any(not s.endswith(".NS") for s in symbols) or symbols == []


# --------- Quote ---------
class TestQuote:
    def test_quote_valid(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/quote/AAPL", timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["symbol"] == "AAPL"
        assert isinstance(d["price"], (int, float)) and d["price"] > 0
        assert "change" in d and "change_pct" in d
        assert "sector" in d

    def test_quote_invalid(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/quote/INVALIDSYM_XYZ123", timeout=TIMEOUT)
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text[:200]}"


# --------- Stock Analyze (AI) ---------
class TestStockAnalyze:
    def test_analyze_aapl(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/stock/AAPL/analyze", timeout=AI_TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "quote" in d and d["quote"]["symbol"] == "AAPL"
        assert "news" in d and isinstance(d["news"], list)
        a = d.get("analysis") or {}
        assert a.get("recommendation") in ("BUY", "HOLD", "SELL"), f"got {a.get('recommendation')}"
        assert isinstance(a.get("confidence"), int) and 0 <= a["confidence"] <= 100
        for k in ("bull_case", "bear_case", "key_risks", "key_opportunities"):
            assert isinstance(a.get(k), list), f"{k} missing/not list"
        assert isinstance(a.get("reasoning"), str) and len(a["reasoning"]) > 0
        assert isinstance(a.get("summary"), str) and len(a["summary"]) > 0


# --------- News ---------
class TestNews:
    def test_news_market(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/news", timeout=AI_TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("items"), list)
        s = d.get("summary") or {}
        for k in ("positive", "negative", "neutral", "summary"):
            assert k in s, f"missing {k} in news summary"
        assert isinstance(s["summary"], str)


# --------- Scanner ---------
class TestScanner:
    def test_scanner_us(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/scanner", params={"market": "us"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("opportunities"), list)
        if d["opportunities"]:
            op = d["opportunities"][0]
            assert "symbol" in op and "score" in op and isinstance(op.get("reasons"), list)


# --------- Briefing (AI) ---------
class TestBriefing:
    def test_briefing_us(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/briefing", params={"market": "us"}, timeout=AI_TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "date" in d
        assert isinstance(d.get("sentiment_score"), int)
        b = d.get("briefing") or {}
        for k in ("headline", "what_matters", "stocks_to_watch", "risks_to_watch",
                  "economic_events", "closing_thought"):
            assert k in b, f"briefing missing {k}"
        assert isinstance(b["what_matters"], list)
        assert isinstance(b["stocks_to_watch"], list)
        assert isinstance(b["closing_thought"], str)


# --------- Search ---------
class TestSearch:
    def test_search_apple(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/search", params={"q": "apple"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        results = d.get("results") or []
        assert isinstance(results, list)
        # Should return at least one result, ideally AAPL among them
        assert len(results) > 0
        assert any((r.get("symbol") or "").upper() == "AAPL" for r in results)


# --------- Watchlist CRUD ---------
class TestWatchlist:
    SYMBOL = "MSFT"

    def test_a_add(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/watchlist",
                            json={"symbol": self.SYMBOL}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

    def test_b_get(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/watchlist", timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        items = r.json().get("items") or []
        assert any(i.get("symbol") == self.SYMBOL for i in items), \
            f"{self.SYMBOL} not in watchlist {items}"

    def test_c_delete(self, api_client, base_url):
        r = api_client.delete(f"{base_url}/api/watchlist/{self.SYMBOL}", timeout=TIMEOUT)
        assert r.status_code == 200
        # verify
        r2 = api_client.get(f"{base_url}/api/watchlist", timeout=TIMEOUT)
        items = r2.json().get("items") or []
        assert not any(i.get("symbol") == self.SYMBOL for i in items)


# --------- Portfolio CRUD ---------
class TestPortfolio:

    @classmethod
    def teardown_class(cls):
        import requests as rq
        import os
        url = (os.environ.get("EXPO_BACKEND_URL")
               or os.environ.get("EXPO_PUBLIC_BACKEND_URL")
               or "https://market-copilot-8.preview.emergentagent.com").rstrip("/")
        for s in ("AAPL", "MSFT"):
            try:
                rq.delete(f"{url}/api/portfolio/{s}", timeout=30)
            except Exception:
                pass

    def test_a_add_aapl(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/portfolio",
                            json={"symbol": "AAPL", "shares": 10, "avg_price": 150},
                            timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

    def test_b_add_msft(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/portfolio",
                            json={"symbol": "MSFT", "shares": 5, "avg_price": 300},
                            timeout=TIMEOUT)
        assert r.status_code == 200, r.text

    def test_c_get(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/portfolio", timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        h = d.get("holdings") or []
        assert len(h) >= 2
        for k in ("total_value", "total_pl", "total_pl_pct"):
            assert k in d
        for item in h:
            for k in ("symbol", "shares", "avg_price", "current_price", "value", "pl", "pl_pct", "sector"):
                assert k in item, f"holding missing {k}"

    def test_d_analysis(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/portfolio/analysis", timeout=AI_TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        a = d.get("analysis") or {}
        for k in ("health_score", "diversification_score", "concentration_risk",
                  "sector_allocation", "strengths", "weaknesses",
                  "suggested_improvements", "summary"):
            assert k in a, f"portfolio analysis missing {k}"
        assert isinstance(a["sector_allocation"], list)
        assert isinstance(a["summary"], str) and len(a["summary"]) > 0

    def test_e_delete(self, api_client, base_url):
        r = api_client.delete(f"{base_url}/api/portfolio/AAPL", timeout=TIMEOUT)
        assert r.status_code == 200
        r2 = api_client.get(f"{base_url}/api/portfolio", timeout=TIMEOUT)
        symbols = [h["symbol"] for h in (r2.json().get("holdings") or [])]
        assert "AAPL" not in symbols


# --------- Recommendation-change alert flow ---------
class TestAlertsRecommendationChange:
    """Force a different cached recommendation, then call analyze to trigger an alert."""
    SYMBOL = "NVDA"

    def test_recommendation_change_alert(self, api_client, base_url):
        # 1. ensure analyze has run to populate cached rec
        r = api_client.get(f"{base_url}/api/stock/{self.SYMBOL}/analyze", timeout=AI_TIMEOUT)
        assert r.status_code == 200, r.text
        a = r.json().get("analysis") or {}
        rec = a.get("recommendation")
        assert rec in ("BUY", "HOLD", "SELL")

        # 2. Mutate stored recommendation in MongoDB to something different to force a change
        import pymongo, os
        client = pymongo.MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        db = client[os.environ.get("DB_NAME", "stock_copilot_db")]
        forced = "SELL" if rec != "SELL" else "BUY"
        db.recommendations.update_one({"_id": self.SYMBOL},
                                      {"$set": {"recommendation": forced}}, upsert=True)
        # Invalidate analyze cache so endpoint will re-run AI
        db.cache.delete_one({"_id": f"analyze:{self.SYMBOL}"})

        # 3. Re-analyze - should detect mismatch and emit alert
        r2 = api_client.get(f"{base_url}/api/stock/{self.SYMBOL}/analyze", timeout=AI_TIMEOUT)
        assert r2.status_code == 200, r2.text
        new_rec = (r2.json().get("analysis") or {}).get("recommendation")
        # If AI returned same as forced, alert won't fire; skip rather than fail.
        if new_rec == forced:
            pytest.skip(f"AI returned same recommendation ({forced}); cannot validate alert change.")

        # 4. Check alerts
        time.sleep(1)
        r3 = api_client.get(f"{base_url}/api/alerts", timeout=TIMEOUT)
        assert r3.status_code == 200
        items = r3.json().get("items") or []
        match = [i for i in items if i.get("kind") == "recommendation_change"
                 and i.get("symbol") == self.SYMBOL]
        assert match, f"No recommendation_change alert for {self.SYMBOL}. Alerts: {items[:5]}"
