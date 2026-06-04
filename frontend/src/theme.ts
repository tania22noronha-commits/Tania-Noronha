/**
 * Design tokens for the Personal AI Stock Market Copilot.
 * Pulled from /app/design_guidelines.json (Archetype 5 - Luxury, dark).
 */

export const colors = {
  bg: "#090A0F",
  surface: "#12141C",
  surfaceElevated: "#1A1D27",
  surfaceHover: "#22252F",
  textPrimary: "#FFFFFF",
  textSecondary: "#9CA3AF",
  textTertiary: "#6B7280",
  textAccent: "#E5E7EB",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.16)",
  buy: "#10B981",
  buyBg: "rgba(16,185,129,0.15)",
  sell: "#F43F5E",
  sellBg: "rgba(244,63,94,0.15)",
  hold: "#F59E0B",
  holdBg: "rgba(245,158,11,0.15)",
  neutral: "#6B7280",
  accent: "#A78BFA",
  gold: "#D4AF37",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const fontSize = {
  xxs: 10,
  xs: 12,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 32,
  hero: 40,
};

export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  black: "800" as const,
};

export function signalColor(rec?: string | null) {
  const r = (rec || "").toUpperCase();
  if (r === "BUY" || r === "STRONG_BUY") return { fg: colors.buy, bg: colors.buyBg, label: "BUY" };
  if (r === "SELL" || r === "STRONG_SELL") return { fg: colors.sell, bg: colors.sellBg, label: "SELL" };
  if (r === "HOLD") return { fg: colors.hold, bg: colors.holdBg, label: "HOLD" };
  return { fg: colors.neutral, bg: "rgba(107,114,128,0.15)", label: r || "—" };
}

export function sentimentColor(score: number) {
  if (score >= 65) return colors.buy;
  if (score >= 45) return colors.hold;
  if (score >= 30) return colors.neutral;
  return colors.sell;
}

export function changeColor(pct: number | null | undefined) {
  if (pct == null) return colors.textSecondary;
  if (pct > 0) return colors.buy;
  if (pct < 0) return colors.sell;
  return colors.textSecondary;
}
