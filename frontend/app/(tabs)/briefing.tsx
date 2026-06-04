import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontSize, fontWeight, radius, spacing, changeColor, sentimentColor } from "@/src/theme";
import { Card } from "@/src/components/Card";
import { LoadingState } from "@/src/components/LoadingState";
import { getBriefing } from "@/src/api";
import { storage } from "@/src/utils/storage";

export default function BriefingScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [market, setMarket] = useState<string>("both");

  const load = async (force = false) => {
    try {
      const m = (await storage.getItem("market", "both")) || "both";
      setMarket(m);
      const d = await getBriefing(m, force);
      setData(d);
    } catch (e) {
      console.warn("briefing", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(true); };

  const b = data?.briefing || {};

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>YOUR ANALYST</Text>
          <Text style={styles.title}>Daily Briefing</Text>
          <Text style={styles.date}>{data?.date || ""} · 2 min read</Text>
        </View>
        <TouchableOpacity onPress={() => { setLoading(true); load(true); }} testID="regenerate-briefing">
          <Ionicons name="refresh" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading && !data ? (
        <LoadingState label="Drafting your briefing…" />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
        >
          {/* Sentiment strip */}
          <Card style={styles.sentimentCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.metaLabel}>MARKET SENTIMENT</Text>
              <Text style={[styles.sentimentScore, { color: sentimentColor(data?.sentiment_score ?? 50) }]}>
                {data?.sentiment_score ?? "—"}
                <Text style={{ color: colors.textTertiary, fontSize: fontSize.md }}> /100</Text>
              </Text>
            </View>
            <View style={styles.indexCol}>
              {(data?.indexes || []).slice(0, 3).map((ix: any) => (
                <View key={ix.symbol} style={styles.indexRow}>
                  <Text style={styles.indexName}>{ix.display_name}</Text>
                  <Text style={[styles.indexChg, { color: changeColor(ix.change_pct) }]}>
                    {ix.change_pct >= 0 ? "+" : ""}{ix.change_pct.toFixed(2)}%
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Headline */}
          <Card style={styles.card}>
            <Text style={styles.metaLabel}>HEADLINE</Text>
            <Text style={styles.headline}>{b.headline || "Awaiting today's read…"}</Text>
          </Card>

          {/* What matters */}
          <Section title="What Matters Today" items={b.what_matters} icon="flash" tone="primary" />

          {/* Stocks to watch */}
          {b.stocks_to_watch?.length ? (
            <Card style={styles.card}>
              <Text style={styles.metaLabel}>STOCKS TO WATCH</Text>
              {b.stocks_to_watch.map((s: any, i: number) => (
                <View key={i} style={styles.watchItem}>
                  <View style={styles.watchSymbol}>
                    <Text style={styles.watchSymbolText}>{s.symbol?.replace(".NS", "")}</Text>
                  </View>
                  <Text style={styles.watchReason}>{s.reason}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {/* Risks */}
          <Section title="Risks to Watch" items={b.risks_to_watch} icon="warning" tone="sell" />

          {/* Economic Events */}
          <Section title="Economic Calendar" items={b.economic_events} icon="calendar" tone="hold" />

          {/* Closing */}
          {b.closing_thought ? (
            <Card style={[styles.card, styles.closingCard]}>
              <Text style={styles.metaLabel}>TAKEAWAY</Text>
              <Text style={styles.closing}>{b.closing_thought}</Text>
            </Card>
          ) : null}

          <Text style={styles.disclaimer}>AI-generated. Not investment advice.</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Section({ title, items, icon, tone }: { title: string; items?: string[]; icon: any; tone: "primary" | "sell" | "hold" }) {
  if (!items || items.length === 0) return null;
  const dotColor = tone === "sell" ? colors.sell : tone === "hold" ? colors.hold : colors.buy;
  return (
    <Card style={styles.card}>
      <View style={styles.sectionTitle}>
        <Ionicons name={icon} size={16} color={dotColor} />
        <Text style={styles.sectionTitleText}>{title}</Text>
      </View>
      {items.map((it, i) => (
        <View key={i} style={styles.bullet}>
          <View style={[styles.bulletDot, { backgroundColor: dotColor }]} />
          <Text style={styles.bulletText}>{it}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  brand: { color: colors.gold, fontSize: 11, letterSpacing: 3, fontWeight: fontWeight.bold },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: fontWeight.bold, marginTop: 4, letterSpacing: -0.5 },
  date: { color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 4, letterSpacing: 0.5 },
  sentimentCard: {
    marginHorizontal: spacing.md, marginBottom: spacing.sm,
    flexDirection: "row", alignItems: "center", gap: spacing.md,
  },
  metaLabel: { color: colors.textTertiary, fontSize: 10, letterSpacing: 2, fontWeight: fontWeight.bold, marginBottom: 6 },
  sentimentScore: { fontSize: 40, fontWeight: fontWeight.black, letterSpacing: -1 },
  indexCol: { gap: 6, minWidth: 120 },
  indexRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  indexName: { color: colors.textSecondary, fontSize: fontSize.xs },
  indexChg: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, fontVariant: ["tabular-nums"] },
  card: { marginHorizontal: spacing.md, marginTop: spacing.sm },
  headline: { color: colors.textPrimary, fontSize: fontSize.lg, lineHeight: 28, fontWeight: fontWeight.semibold, letterSpacing: -0.3 },
  sectionTitle: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm },
  sectionTitleText: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
  bullet: { flexDirection: "row", gap: 10, paddingVertical: 6 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  bulletText: { flex: 1, color: colors.textAccent, fontSize: fontSize.sm, lineHeight: 21 },
  watchItem: { flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 8 },
  watchSymbol: { backgroundColor: colors.surfaceElevated, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm, minWidth: 64, alignItems: "center" },
  watchSymbolText: { color: colors.textPrimary, fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  watchReason: { flex: 1, color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 },
  closingCard: { backgroundColor: colors.surfaceElevated, borderColor: colors.borderStrong },
  closing: { color: colors.textPrimary, fontSize: fontSize.md, lineHeight: 24, fontStyle: "italic" },
  disclaimer: { color: colors.textTertiary, fontSize: 11, textAlign: "center", padding: spacing.lg },
});
