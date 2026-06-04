# Personal AI Stock Market Copilot — PRD

## Vision
A private, single-user mobile app that acts as an AI stock market copilot. Tells the user **what to buy, sell, or hold today, and why** — in plain English. Feels like having a hedge-fund analyst working exclusively for one investor.

## User Choices Captured
- AI Model: GPT-4o-mini (via Emergent Universal LLM Key)
- Market Data: Yahoo Finance (free, no keys)
- News: Yahoo Finance news (bundled)
- Markets: US (NASDAQ/NYSE) + India (NSE/BSE)
- Daily Briefing: Auto-generates once per day (cached)

## Tech Stack (deviation from problem statement — necessary)
- Frontend: **React Native + Expo Router** (problem statement asked for Next.js+Tailwind, but our platform is mobile/Expo. Same dark-card design language preserved.)
- Backend: **FastAPI (Python)** instead of Node.js — matches our platform's pre-shipped backend stack.
- Database: **MongoDB** (single-user; caches dashboard, briefing, analysis, news; persists watchlist, portfolio, alerts).
- AI: OpenAI GPT-4o-mini via `emergentintegrations` library + Emergent LLM key.
- Market Data: `yfinance` (free, no API key needed).

## Features Implemented

### Dashboard (`/`)
- Market sentiment score 0–100 (sentiment ring) with tone label
- Major indexes (S&P, NASDAQ, Dow, Nifty, Sensex)
- AI-generated plain-English market summary
- Top 5 BUY candidates + Top 5 SELL/AVOID
- Market chips: Global / US / India

### Stock Analyzer (`/stock/[symbol]`)
- Quote (price, change, sector, P/E, 52w high)
- BUY/HOLD/SELL pill + confidence bar
- AI-generated summary + reasoning
- Bull case + Bear case (side-by-side cards)
- Key risks + Key opportunities
- Recent news (tappable to open)
- "Save to Watchlist" star

### Daily Briefing (`/briefing`)
- Auto-generated daily, max 2 min read
- Sentiment, headline, what matters, stocks to watch, risks, economic events, closing thought
- Manual refresh

### Watchlist (`/watchlist`)
- Add/remove unlimited stocks
- Each shows price, change, AI recommendation pill
- Search modal with live suggestions

### Portfolio (`/portfolio`)
- Add holdings (symbol + shares + avg price)
- Total value, P/L, cost basis
- AI Analysis: health score, diversification score, concentration risk, sector allocation, strengths/weaknesses, suggested improvements, plain-English overview

### Opportunity Scanner (`/scanner`)
- Ranked list with conviction score
- Reasons (volume, momentum, analyst upside, earnings growth)

### Alerts (backend, surfacing via API)
- Recommendation changes
- Portfolio imbalance (>35% concentration)

## API Endpoints
- `GET /api/dashboard?market=us|in|both`
- `GET /api/briefing?market=...&force=true`
- `GET /api/quote/{symbol}`
- `GET /api/stock/{symbol}/analyze`
- `GET /api/news?symbol=...`
- `GET /api/scanner?market=...`
- `GET /api/search?q=...`
- Watchlist: `GET /api/watchlist`, `POST /api/watchlist`, `DELETE /api/watchlist/{symbol}`
- Portfolio: `GET /api/portfolio`, `POST /api/portfolio`, `DELETE /api/portfolio/{symbol}`, `GET /api/portfolio/analysis`
- Alerts: `GET /api/alerts`, `POST /api/alerts/{id}/read`, `DELETE /api/alerts`

## Caching
- Dashboard: 10 min
- Stock analysis: 60 min
- News: 20 min
- Scanner: 15 min
- Briefing: 24 hours (per market, per date)
- Portfolio analysis: 60 min

## Rules Honored
- Always shows reasoning + confidence
- "Not financial advice" disclaimer on every screen
- No subscriptions, payments, social features, ads, auth
- Single-user
