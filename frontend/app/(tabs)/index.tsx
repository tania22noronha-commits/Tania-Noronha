import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, Modal } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, fontSize, fontWeight, radius, spacing, changeColor } from "@/src/theme";
import { SentimentRing } from "@/src/components/SentimentRing";
import { Card } from "@/src/components/Card";
import { SectionHeader } from "@/src/components/SectionHeader";
import { StockRow } from "@/src/components/StockRow";
import { LoadingState } from "@/src/components/LoadingState";
import { getDashboard, searchStocks } from "@/src/api";
import { storage } from "@/src/utils/storage";

type Market = "us" | "in" | "both";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [market, setMarket] = useState<Market>("both");
  const [searchOpen, setSearchOpen] = useState(false);

  const load = useCallback(async (m: Market) => {
    try {
      const d = await getDashboard(m);
      setData(d);
    } catch (e) {
      console.warn("dashboard error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const saved = (await storage.getItem("market", "both")) as Market;
      const m = saved || "both";
      setMarket(m);
      await load(m);
    })();
  }, [load]);

  const changeMarket = async (m: Market) => {
    setMarket(m);
    await storage.setItem("market", m);
    setLoading(true);
    await load(m);
  };

  const onRefresh = () => {
    setRefreshing(true);
    load(market);
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      {/* Sticky header */}
      <View style={styles.header} testID="dashboard-header">
        <View>
          <Text style={styles.brand}>COPILOT</Text>
          <Text style={styles.title}>Good morning</Text>
        </View>
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => setSearchOpen(true)}
          testID="open-search-button"
        >
          <Ionicons name="search" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Market chips */}
      <View style={styles.chipsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
        >
          {(["both", "us", "in"] as Market[]).map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => changeMarket(m)}
              style={[styles.chip, market === m && styles.chipActive]}
              testID={`market-chip-${m}`}
            >
              <Text style={[styles.chipText, market === m && styles.chipTextActive]}>
                {m === "us" ? "US" : m === "in" ? "India" : "Global"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && !data ? (
        <LoadingState label="Reading the markets…" />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
        >
          {/* Sentiment + Summary */}
          <Card style={styles.heroCard} testID="market-sentiment-card">
            <SentimentRing score={data?.sentiment_score ?? 50} testID="sentiment-ring" />
            <Text style={styles.summary}>{data?.summary}</Text>
            {data?.indexes?.length ? (
              <View style={styles.indexRow}>
                {data.indexes.slice(0, 5).map((ix: any) => (
                  <View key={ix.symbol} style={styles.indexCell}>
                    <Text style={styles.indexName} numberOfLines={1}>{ix.display_name}</Text>
                    <Text style={[styles.indexChange, { color: changeColor(ix.change_pct) }]}>
                      {ix.change_pct >= 0 ? "+" : ""}{ix.change_pct.toFixed(2)}%
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>

          {/* Top Buy */}
          <SectionHeader title="Today's Top Buys" subtitle="Momentum, volume, analyst conviction" />
          <Card style={styles.listCard}>
            {(data?.top_buy || []).length === 0 ? (
              <Text style={styles.emptyText}>No standout buys right now.</Text>
            ) : (
              (data?.top_buy || []).map((q: any, i: number) => (
                <View key={q.symbol} style={i > 0 && styles.divider}>
                  <StockRow
                    symbol={q.symbol}
                    name={q.name}
                    price={q.price}
                    change_pct={q.change_pct}
                    currency={q.currency}
                    recommendation="BUY"
                    testID={`top-buy-${q.symbol}`}
                  />
                </View>
              ))
            )}
          </Card>

          {/* Top Sell */}
          <SectionHeader title="Top Sell / Avoid" subtitle="Weak momentum or fading conviction" />
          <Card style={styles.listCard}>
            {(data?.top_sell || []).length === 0 ? (
              <Text style={styles.emptyText}>No major weakness today.</Text>
            ) : (
              (data?.top_sell || []).map((q: any, i: number) => (
                <View key={q.symbol} style={i > 0 && styles.divider}>
                  <StockRow
                    symbol={q.symbol}
                    name={q.name}
                    price={q.price}
                    change_pct={q.change_pct}
                    currency={q.currency}
                    recommendation="SELL"
                    testID={`top-sell-${q.symbol}`}
                  />
                </View>
              ))
            )}
          </Card>

          <Text style={styles.disclaimer}>
            Not financial advice. AI-generated insights for research only.
          </Text>
        </ScrollView>
      )}

      <SearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
    </SafeAreaView>
  );
}

/* ----- Search Modal ----- */

function SearchModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) {
      setQ("");
      setResults([]);
    }
  }, [visible]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 1) {
        setResults([]);
        return;
      }
      setBusy(true);
      try {
        const r = await searchStocks(q.trim());
        setResults(r.results || []);
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
        <View style={styles.searchHeader}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search any stock or ticker…"
            placeholderTextColor={colors.textTertiary}
            autoFocus
            value={q}
            onChangeText={setQ}
            autoCapitalize="characters"
            autoCorrect={false}
            testID="search-input"
          />
          <TouchableOpacity onPress={onClose} testID="close-search">
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
          {busy ? <LoadingState label="Searching…" /> : null}
          {!busy && q && results.length === 0 ? (
            <Text style={styles.searchEmpty}>No matches. Try AAPL, RELIANCE.NS, MSFT…</Text>
          ) : null}
          {results.map((r) => (
            <TouchableOpacity
              key={r.symbol}
              style={styles.resultRow}
              onPress={() => {
                onClose();
                router.push(`/stock/${r.symbol}` as any);
              }}
              testID={`search-result-${r.symbol}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.resultSymbol}>{r.symbol}</Text>
                <Text style={styles.resultName} numberOfLines={1}>{r.name}</Text>
              </View>
              <Text style={styles.resultExchange}>{r.exchange}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  brand: { color: colors.gold, fontSize: 11, letterSpacing: 3, fontWeight: fontWeight.bold },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: fontWeight.bold, letterSpacing: -0.5, marginTop: 4 },
  searchBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  chipsRow: { height: 56, justifyContent: "center" },
  chipsContent: { paddingHorizontal: spacing.md, gap: 8 },
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    justifyContent: "center", alignItems: "center",
  },
  chipActive: { borderColor: colors.textPrimary, backgroundColor: colors.surfaceElevated },
  chipText: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.5 },
  chipTextActive: { color: colors.textPrimary },
  heroCard: {
    marginHorizontal: spacing.md, marginTop: spacing.sm,
    alignItems: "center", paddingVertical: spacing.lg, gap: spacing.md,
  },
  summary: {
    color: colors.textSecondary, fontSize: fontSize.sm,
    textAlign: "center", lineHeight: 20, paddingHorizontal: spacing.sm,
  },
  indexRow: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "center",
    gap: spacing.sm, marginTop: spacing.xs,
  },
  indexCell: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.sm, minWidth: 80, alignItems: "center",
  },
  indexName: { color: colors.textTertiary, fontSize: 10, fontWeight: fontWeight.semibold, letterSpacing: 0.5 },
  indexChange: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginTop: 2, fontVariant: ["tabular-nums"] },
  listCard: { marginHorizontal: spacing.md },
  divider: { borderTopColor: colors.border, borderTopWidth: 1 },
  emptyText: { color: colors.textTertiary, fontSize: fontSize.sm, textAlign: "center", padding: spacing.md },
  disclaimer: {
    color: colors.textTertiary, fontSize: 11, textAlign: "center",
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, lineHeight: 16,
  },
  // Search modal
  searchHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomColor: colors.border, borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1, color: colors.textPrimary, fontSize: fontSize.base,
    paddingVertical: 10, letterSpacing: 0.5,
  },
  searchEmpty: { color: colors.textTertiary, padding: spacing.lg, textAlign: "center", fontSize: fontSize.sm },
  resultRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    borderBottomColor: colors.border, borderBottomWidth: 1,
  },
  resultSymbol: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  resultName: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  resultExchange: { color: colors.textTertiary, fontSize: fontSize.xs },
});
