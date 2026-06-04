/**
 * API client for the AI Stock Market Copilot backend.
 */

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";

async function request<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j.detail || JSON.stringify(j);
    } catch {
      detail = await res.text();
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json();
}

// Market
export const getDashboard = (market = "both") => request(`/dashboard?market=${market}`);
export const getBriefing = (market = "both", force = false) =>
  request(`/briefing?market=${market}&force=${force}`);
export const getNews = (symbol?: string) =>
  request(symbol ? `/news?symbol=${symbol}` : `/news`);
export const getScanner = (market = "both") => request(`/scanner?market=${market}`);
export const getQuote = (symbol: string) => request(`/quote/${symbol}`);
export const analyzeStock = (symbol: string) => request(`/stock/${symbol}/analyze`);
export const getStockTimeline = (symbol: string, days = 7) =>
  request(`/stock/${symbol}/timeline?days=${days}`);
export const searchStocks = (q: string) => request(`/search?q=${encodeURIComponent(q)}`);

// Watchlist
export const getWatchlist = () => request(`/watchlist`);
export const addWatchlist = (symbol: string) =>
  request(`/watchlist`, { method: "POST", body: JSON.stringify({ symbol }) });
export const removeWatchlist = (symbol: string) =>
  request(`/watchlist/${symbol}`, { method: "DELETE" });

// Portfolio
export const getPortfolio = () => request(`/portfolio`);
export const addHolding = (symbol: string, shares: number, avg_price: number) =>
  request(`/portfolio`, {
    method: "POST",
    body: JSON.stringify({ symbol, shares, avg_price }),
  });
export const deleteHolding = (symbol: string) =>
  request(`/portfolio/${symbol}`, { method: "DELETE" });
export const getPortfolioAnalysis = () => request(`/portfolio/analysis`);

// Alerts
export const getAlerts = () => request(`/alerts`);
export const clearAlerts = () => request(`/alerts`, { method: "DELETE" });
export const markAlertRead = (id: string) =>
  request(`/alerts/${id}/read`, { method: "POST" });
