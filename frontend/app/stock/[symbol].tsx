import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontSize, fontWeight, radius, spacing, changeColor, signalColor } from "@/src/theme";
import { Card } from "@/src/components/Card";
import { LoadingState } from "@/src/components/LoadingState";
import { SignalPill } from "@/src/components/SignalPill";
import { analyzeStock, addWatchlist, getStockTimeline } from "@/src/api";
import { ChangeTimeline } from "@/src/components/ChangeTimeline";

export default function StockDetail() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedToWatchlist, setSavedToWatchlist] = useState(false);

  const load = async () => {
    try {
      const d = await analyzeStock(symbol);
      setData(d);
      try {
        const t = await getStockTimeline(symbol, 7);
        setTimeline(t);
      } catch (e) {
        console.warn("timeline", e);
      }
    } catch (e) {
      console.warn("analyze", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [symbol]);

  const saveToWatchlist = async () => {
    try {
      await addWatchlist(symbol);
      setSavedToWatchlist(true);
    } catch (e) { console.warn(e); }
  };

  const q = data?.quote;
  const a = data?.analysis || {};
  const news = data?.news || [];
  const sigPill = signalColor(a.recommendation);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="back-button">
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerSymbol}>{(symbol || "").toString().replace(".NS", "")}</Text>
          {q?.name ? <Text style={styles.headerName} numberOfLines={1}>{q.name}</Text> : null}
        </View>
        <TouchableOpacity onPress={saveToWatchlist} style={styles.iconBtn} testID="save-watchlist-button">
          <Ionicons name={savedToWatchlist ? "star" : "star-outline"} size={20} color={savedToWatchlist ? colors.gold : colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingState label="Your analyst is thinking…" />
      ) : !q ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Stock not found.</Text></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.textSecondary} />}
        >
          {/* Price card */}
          <Card style={styles.priceCard}>
            <Text style={styles.priceLine}>
              {q.currency === "INR" ? "₹" : "$"}{q.price.toFixed(2)}
            </Text>
            <Text style={[styles.changeLine, { color: changeColor(q.change_pct) }]}>
              {q.change >= 0 ? "+" : ""}{q.change.toFixed(2)} ({q.change_pct >= 0 ? "+" : ""}{q.change_pct.toFixed(2)}%) today
            </Text>
            <View style={styles.metaRow}>
              <MetaBox label="Sector" value={q.sector} />
              <MetaBox label="P/E" value={q.pe_ratio?.toFixed(1) || "—"} />
              <MetaBox label="52w High" value={q.fifty_two_week_high ? `${q.fifty_two_week_high.toFixed(0)}` : "—"} />
            </View>
          </Card>

          {/* Recommendation card */}
          {a.recommendation ? (
            <Card style={[styles.recCard, { borderColor: sigPill.fg + "33" }]}>
              <View style={styles.recTop}>
                <View style={[styles.bigPill, { backgroundColor: sigPill.bg, borderColor: sigPill.fg + "55" }]}>
                  <Text style={[styles.bigPillText, { color: sigPill.fg }]}>{sigPill.label}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.confLabel}>CONFIDENCE</Text>
                  <View style={styles.confBar}>
                    <View style={[styles.confFill, { width: `${a.confidence || 0}%`, backgroundColor: sigPill.fg }]} />
                  </View>
                  <Text style={[styles.confValue, { color: sigPill.fg }]}>{a.confidence || 0}%</Text>
                </View>
              </View>
              {a.summary ? <Text style={styles.recSummary}>{a.summary}</Text> : null}
              {a.reasoning ? (
                <View style={styles.reasoningBox}>
                  <Text style={styles.reasoningLabel}>WHY</Text>
                  <Text style={styles.reasoningText}>{a.reasoning}</Text>
                </View>
              ) : null}
            </Card>
          ) : null}

          {/* Bull / Bear */}
          {(a.bull_case || a.bear_case) ? (
            <View style={styles.bbRow}>
              <Card style={[styles.bbCard, { borderColor: colors.buy + "33" }]}>
                <View style={styles.bbHeader}>
                  <Ionicons name="trending-up" size={14} color={colors.buy} />
                  <Text style={[styles.bbTitle, { color: colors.buy }]}>BULL CASE</Text>
                </View>
                {(a.bull_case || []).map((b: string, i: number) => (
                  <View key={i} style={styles.bbBullet}>
                    <View style={[styles.bbDot, { backgroundColor: colors.buy }]} />
                    <Text style={styles.bbText}>{b}</Text>
                  </View>
                ))}
              </Card>
              <Card style={[styles.bbCard, { borderColor: colors.sell + "33" }]}>
                <View style={styles.bbHeader}>
                  <Ionicons name="trending-down" size={14} color={colors.sell} />
                  <Text style={[styles.bbTitle, { color: colors.sell }]}>BEAR CASE</Text>
                </View>
                {(a.bear_case || []).map((b: string, i: number) => (
                  <View key={i} style={styles.bbBullet}>
                    <View style={[styles.bbDot, { backgroundColor: colors.sell }]} />
                    <Text style={styles.bbText}>{b}</Text>
                  </View>
                ))}
              </Card>
            </View>
          ) : null}

          {/* What changed since yesterday */}
          {timeline ? (
            <ChangeTimeline diff={timeline.diff} history={timeline.history} />
          ) : null}

          {/* Opportunities */}
          {a.key_opportunities?.length ? (
            <Card style={styles.listCard}>
              <Text style={[styles.metaLabel, { color: colors.buy }]}>OPPORTUNITIES</Text>
              {a.key_opportunities.map((s: string, i: number) => (
                <View key={i} style={styles.iconBullet}>
                  <Ionicons name="arrow-up-circle" size={16} color={colors.buy} />
                  <Text style={styles.bulletText}>{s}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {/* Risks */}
          {a.key_risks?.length ? (
            <Card style={styles.listCard}>
              <Text style={[styles.metaLabel, { color: colors.sell }]}>KEY RISKS</Text>
              {a.key_risks.map((s: string, i: number) => (
                <View key={i} style={styles.iconBullet}>
                  <Ionicons name="alert-circle" size={16} color={colors.sell} />
                  <Text style={styles.bulletText}>{s}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {/* News */}
          {news.length ? (
            <Card style={styles.listCard}>
              <Text style={styles.metaLabel}>RECENT NEWS</Text>
              {news.slice(0, 6).map((n: any, i: number) => (
                <TouchableOpacity
                  key={i}
                  style={styles.newsItem}
                  onPress={() => n.link && Linking.openURL(n.link)}
                  testID={`news-${i}`}
                >
                  <Text style={styles.newsTitle} numberOfLines={2}>{n.title}</Text>
                  <Text style={styles.newsPub}>{n.publisher}</Text>
                </TouchableOpacity>
              ))}
            </Card>
          ) : null}

          <Text style={styles.disclaimer}>AI-generated. Not investment advice.</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function MetaBox({ label, value }: { label: string; value: any }) {
  return (
    <View style={styles.metaBox}>
      <Text style={styles.metaLab}>{label}</Text>
      <Text style={styles.metaVal} numberOfLines={1}>{value || "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    borderBottomColor: colors.border, borderBottomWidth: 1,
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  headerSymbol: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
  headerName: { color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 1 },
  empty: { padding: spacing.xl, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
  priceCard: { marginHorizontal: spacing.md, marginTop: spacing.sm, alignItems: "flex-start" },
  priceLine: { color: colors.textPrimary, fontSize: 40, fontWeight: fontWeight.black, letterSpacing: -1, fontVariant: ["tabular-nums"] },
  changeLine: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: 4, fontVariant: ["tabular-nums"] },
  metaRow: { flexDirection: "row", gap: 8, marginTop: spacing.md, width: "100%" },
  metaBox: { flex: 1, backgroundColor: colors.surfaceElevated, padding: 10, borderRadius: radius.sm, alignItems: "flex-start" },
  metaLab: { color: colors.textTertiary, fontSize: 10, letterSpacing: 1, fontWeight: fontWeight.bold },
  metaVal: { color: colors.textPrimary, fontSize: fontSize.xs, marginTop: 4, fontWeight: fontWeight.semibold },
  recCard: { marginHorizontal: spacing.md, marginTop: spacing.sm, borderWidth: 1 },
  recTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  bigPill: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1,
    alignItems: "center", justifyContent: "center", minWidth: 92,
  },
  bigPillText: { fontSize: fontSize.lg, fontWeight: fontWeight.black, letterSpacing: 2 },
  confLabel: { color: colors.textTertiary, fontSize: 10, letterSpacing: 1.5, fontWeight: fontWeight.bold },
  confBar: { height: 6, backgroundColor: colors.surfaceElevated, borderRadius: 3, overflow: "hidden", marginTop: 6 },
  confFill: { height: "100%", borderRadius: 3 },
  confValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: 4, fontVariant: ["tabular-nums"] },
  recSummary: { color: colors.textPrimary, fontSize: fontSize.md, lineHeight: 24, marginTop: spacing.md, fontWeight: fontWeight.medium },
  reasoningBox: { backgroundColor: colors.surfaceElevated, borderRadius: radius.md, padding: 12, marginTop: spacing.sm },
  reasoningLabel: { color: colors.textTertiary, fontSize: 10, letterSpacing: 1.5, fontWeight: fontWeight.bold, marginBottom: 6 },
  reasoningText: { color: colors.textAccent, fontSize: fontSize.sm, lineHeight: 20 },
  bbRow: { flexDirection: "row", marginHorizontal: spacing.md - 4, marginTop: spacing.sm, gap: 8 },
  bbCard: { flex: 1, marginHorizontal: 4, gap: 6, borderWidth: 1 },
  bbHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  bbTitle: { fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 1.5 },
  bbBullet: { flexDirection: "row", gap: 8, marginTop: 6 },
  bbDot: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
  bbText: { flex: 1, color: colors.textAccent, fontSize: fontSize.xs, lineHeight: 18 },
  metaLabel: { color: colors.textTertiary, fontSize: 10, letterSpacing: 2, fontWeight: fontWeight.bold, marginBottom: 8 },
  listCard: { marginHorizontal: spacing.md, marginTop: spacing.sm },
  iconBullet: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 6 },
  bulletText: { flex: 1, color: colors.textAccent, fontSize: fontSize.sm, lineHeight: 20 },
  newsItem: { paddingVertical: 10, borderTopColor: colors.border, borderTopWidth: 1 },
  newsTitle: { color: colors.textPrimary, fontSize: fontSize.sm, lineHeight: 20 },
  newsPub: { color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 4 },
  disclaimer: { color: colors.textTertiary, fontSize: 11, textAlign: "center", padding: spacing.lg },
});
