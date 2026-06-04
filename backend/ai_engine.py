"""AI layer using Emergent LLM key (GPT-4o-mini for speed & cost)."""
import os
import json
import logging
import re
from typing import Dict, List, Optional
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
MODEL_PROVIDER = "openai"
MODEL_NAME = "gpt-4o-mini"


def _new_chat(session_id: str, system_message: str) -> LlmChat:
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)


def _extract_json(text: str) -> Optional[dict]:
    """Extract first JSON object from LLM text response."""
    if not text:
        return None
    # Try fenced code block first
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    # Try raw braces
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            pass
    return None


async def _ask_json(session_id: str, system: str, prompt: str) -> dict:
    chat = _new_chat(session_id, system)
    resp = await chat.send_message(UserMessage(text=prompt))
    text = resp if isinstance(resp, str) else str(resp)
    data = _extract_json(text)
    if not data:
        logger.warning(f"Could not parse JSON from LLM. Raw: {text[:300]}")
        return {}
    return data


# ---------- AI Endpoints ----------

async def analyze_stock(quote: Dict, news: List[Dict]) -> Dict:
    """Generate BUY/HOLD/SELL recommendation with reasoning."""
    news_block = "\n".join([f"- {n['title']}" for n in news[:8]]) or "No recent news."
    system = (
        "You are a senior equity research analyst writing for a private investor. "
        "Be decisive, clear, and use plain English. Always provide reasoning. "
        "Never give guaranteed advice — always express conviction with a confidence score. "
        "Output ONLY valid JSON with the requested schema, no prose outside the JSON."
    )
    prompt = f"""Analyze this stock and produce a recommendation.

STOCK: {quote['symbol']} - {quote['name']}
Sector: {quote.get('sector', 'Unknown')}
Price: {quote['price']} {quote.get('currency','USD')} ({quote['change_pct']:+.2f}% today)
52w range: {quote.get('fifty_two_week_low')} - {quote.get('fifty_two_week_high')}
P/E ratio: {quote.get('pe_ratio')}
Market cap: {quote.get('market_cap')}
Analyst target: {quote.get('target_mean_price')}
Earnings growth: {quote.get('earnings_growth')}
Analyst consensus: {quote.get('analyst_recommendation')}
Beta: {quote.get('beta')}
Dividend yield: {quote.get('dividend_yield')}

RECENT NEWS:
{news_block}

Return JSON with this exact schema:
{{
  "recommendation": "BUY" | "HOLD" | "SELL",
  "confidence": <integer 0-100>,
  "summary": "<one sentence, plain English>",
  "bull_case": ["<3-4 short bullet points>"],
  "bear_case": ["<3-4 short bullet points>"],
  "key_risks": ["<2-3 short bullets>"],
  "key_opportunities": ["<2-3 short bullets>"],
  "reasoning": "<one paragraph explaining the call in plain English, max 80 words>"
}}"""
    return await _ask_json(f"analyze-{quote['symbol']}", system, prompt)


async def summarize_news(news: List[Dict], context: str = "the broader market") -> Dict:
    """Group news into positive/negative/neutral with a plain English summary."""
    if not news:
        return {"positive": [], "negative": [], "neutral": [], "summary": "No fresh news right now."}

    items = "\n".join([
        f"{i+1}. [{n.get('related_symbol','')}] {n['title']} — {n.get('publisher','')}"
        for i, n in enumerate(news[:20])
    ])
    system = (
        "You are a market news editor. Classify news by impact and write plain-English summaries. "
        "Output ONLY valid JSON."
    )
    prompt = f"""Classify the following news headlines by their likely market impact on {context}.

NEWS:
{items}

Return JSON with this schema:
{{
  "positive": [{{"title": "...", "why": "<one line, plain English>"}}],
  "negative": [{{"title": "...", "why": "<one line>"}}],
  "neutral":  [{{"title": "...", "why": "<one line>"}}],
  "summary": "<2-3 sentences in plain English describing today's overall news sentiment for {context}>"
}}
Use the EXACT titles from the input. Limit each bucket to 5 items."""
    return await _ask_json("news-summary", system, prompt)


async def daily_briefing(indexes: List[Dict], top_buy: List[Dict], top_sell: List[Dict],
                         news: List[Dict], sentiment: int) -> Dict:
    """Generate the morning briefing (< 2 min read)."""
    ix_str = "\n".join([f"- {i['display_name']}: {i['change_pct']:+.2f}%" for i in indexes])
    buy_str = ", ".join([q["symbol"] for q in top_buy[:5]]) or "—"
    sell_str = ", ".join([q["symbol"] for q in top_sell[:5]]) or "—"
    news_str = "\n".join([f"- {n['title']}" for n in news[:10]]) or "—"

    system = (
        "You are an elite hedge-fund analyst writing the morning briefing for one private client. "
        "Be confident, plain-spoken, and concise. Maximum total reading time: 2 minutes. "
        "Output ONLY valid JSON."
    )
    prompt = f"""Create today's market briefing.

MARKET SENTIMENT SCORE: {sentiment}/100

INDEX MOVES:
{ix_str}

TOP BUY CANDIDATES: {buy_str}
TOP SELL/AVOID:    {sell_str}

KEY HEADLINES:
{news_str}

Return JSON:
{{
  "headline": "<one bold sentence framing today's market>",
  "what_matters": ["<3-4 short bullets - the most important things today>"],
  "stocks_to_watch": [{{"symbol": "...", "reason": "<one line>"}}],
  "risks_to_watch": ["<2-3 bullets>"],
  "economic_events": ["<2-3 bullets - earnings, Fed, data releases or 'No major events scheduled'>"],
  "closing_thought": "<one sentence with the takeaway>"
}}"""
    return await _ask_json("daily-briefing", system, prompt)


async def analyze_portfolio(holdings: List[Dict]) -> Dict:
    """Analyze portfolio holdings for diversification, risk and improvements."""
    if not holdings:
        return {}

    h_str = "\n".join([
        f"- {h['symbol']}: {h.get('shares', 0)} shares @ avg ${h.get('avg_price', 0)}, "
        f"current ${h.get('current_price', 0)}, sector: {h.get('sector', 'Unknown')}, "
        f"value ${h.get('value', 0):.0f}"
        for h in holdings
    ])
    total = sum(h.get("value", 0) for h in holdings)

    system = (
        "You are a portfolio strategist for a private investor. "
        "Be decisive, plain-spoken, output ONLY valid JSON."
    )
    prompt = f"""Analyze this portfolio. Total value: ${total:.0f}

HOLDINGS:
{h_str}

Return JSON:
{{
  "diversification_score": <0-100>,
  "concentration_risk": "LOW" | "MEDIUM" | "HIGH",
  "concentration_explanation": "<one line>",
  "health_score": <0-100>,
  "sector_allocation": [{{"sector": "...", "weight_pct": <number>}}],
  "strengths": ["<2-3 bullets>"],
  "weaknesses": ["<2-3 bullets>"],
  "suggested_improvements": ["<3-4 actionable suggestions in plain English>"],
  "summary": "<2 sentences plain-English overview>"
}}"""
    return await _ask_json("portfolio-analysis", system, prompt)
