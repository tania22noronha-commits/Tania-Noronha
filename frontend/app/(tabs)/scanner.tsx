import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, fontSize, fontWeight, radius, spacing, changeColor } from "@/src/theme";
import { Card } from "@/src/components/Card";
import { LoadingState } from "@/src/components/LoadingState";
import { getScanner } from "@/src/api";
import { storage } from "@/src/utils/storage";

export default function ScannerScreen() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const m = (await storage.getItem("market", "both")) || "both";
      const d = await getScanner(m);
      setData(d);
    } catch (e) { console.warn("scanner", e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const opps = data?.opportunities || [];

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>EDGE FINDER</Text>
          <Text style={styles.title}>Opportunity Scanner</Text>
          <Text style={styles.sub}>Volume · Momentum · Earnings · Analyst signals</Text>
        </View>
      </View>

      {loading ? (
        <LoadingState label="Scanning the tape…" />
      ) : opps.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="telescope-outline" size={36} color={colors.textTertiary} />
          <Text style={styles.emptyText}>Nothing standout in this universe right now.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.textSecondary} />}
        >
          {opps.map((o: any, i: number) => (
            <TouchableOpacity
              key={o.symbol}
              activeOpacity={0.8}
              onPress={() => router.push(`/stock/${o.symbol}` as any)}
              testID={`opportunity-${o.symbol}`}
            >
              <Card style={styles.oppCard}>
                <View style={styles.oppTop}>
                  <View style={styles.rankBubble}>
                    <Text style={styles.rankText}>#{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.oppTitleLine}>
                      <Text style={styles.oppSymbol}>{o.symbol.replace(".NS", "")}</Text>
                      <Text style={styles.oppSector}>· {o.sector}</Text>
                    </View>
                    <Text style={styles.oppName} numberOfLines={1}>{o.name}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.oppPrice}>${o.price.toFixed(2)}</Text>
                    <Text style={[styles.oppChange, { color: changeColor(o.change_pct) }]}>
                      {o.change_pct >= 0 ? "+" : ""}{o.change_pct.toFixed(2)}%
                    </Text>
                  </View>
                </View>
                <View style={styles.reasonGrid}>
                  {o.reasons.map((r: string, i2: number) => (
                    <View key={i2} style={styles.reasonChip}>
                      <View style={styles.reasonDot} />
                      <Text style={styles.reasonText}>{r}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.scoreBar}>
                  <View style={[styles.scoreFill, { width: `${Math.min(100, o.score * 2)}%` }]} />
                </View>
                <Text style={styles.scoreLabel}>Conviction score · {o.score.toFixed(1)}</Text>
              </Card>
            </TouchableOpacity>
          ))}
          <Text style={styles.disclaimer}>AI-generated. Verify before acting.</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
  brand: { color: colors.gold, fontSize: 11, letterSpacing: 3, fontWeight: fontWeight.bold },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: fontWeight.bold, marginTop: 4, letterSpacing: -0.5 },
  sub: { color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 4 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { color: colors.textSecondary },
  oppCard: { marginHorizontal: spacing.md, marginBottom: spacing.sm, gap: spacing.sm },
  oppTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rankBubble: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  rankText: { color: colors.gold, fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  oppTitleLine: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  oppSymbol: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
  oppSector: { color: colors.textTertiary, fontSize: fontSize.xs },
  oppName: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  oppPrice: { color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold, fontVariant: ["tabular-nums"] },
  oppChange: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginTop: 2, fontVariant: ["tabular-nums"] },
  reasonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  reasonChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surfaceElevated, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm },
  reasonDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.buy },
  reasonText: { color: colors.textAccent, fontSize: fontSize.xs },
  scoreBar: { height: 4, backgroundColor: colors.surfaceElevated, borderRadius: 2, overflow: "hidden", marginTop: 4 },
  scoreFill: { height: "100%", backgroundColor: colors.gold, borderRadius: 2 },
  scoreLabel: { color: colors.textTertiary, fontSize: 10, letterSpacing: 0.5 },
  disclaimer: { color: colors.textTertiary, fontSize: 11, textAlign: "center", padding: spacing.lg },
});
