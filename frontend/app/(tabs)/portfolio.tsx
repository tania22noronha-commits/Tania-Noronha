import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { colors, fontSize, fontWeight, radius, spacing, changeColor, sentimentColor } from "@/src/theme";
import { Card } from "@/src/components/Card";
import { SectionHeader } from "@/src/components/SectionHeader";
import { StockRow } from "@/src/components/StockRow";
import { LoadingState } from "@/src/components/LoadingState";
import { getPortfolio, getPortfolioAnalysis, addHolding, deleteHolding, searchStocks } from "@/src/api";

export default function PortfolioScreen() {
  const [portfolio, setPortfolio] = useState<any>({ holdings: [], total_value: 0, total_pl: 0, total_pl_pct: 0 });
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await getPortfolio();
      setPortfolio(p);
    } catch (e) { console.warn("portfolio", e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const a = await getPortfolioAnalysis();
      setAnalysis(a);
    } catch (e) { console.warn("analysis", e); }
    finally { setAnalyzing(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalPlColor = changeColor(portfolio.total_pl_pct);
  const hasHoldings = (portfolio.holdings || []).length > 0;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>HOLDINGS</Text>
          <Text style={styles.title}>Portfolio</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)} testID="add-holding-button">
          <Ionicons name="add" size={22} color={colors.bg} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingState />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.textSecondary} />}
        >
          {/* Summary card */}
          <Card style={styles.summaryCard}>
            <Text style={styles.metaLabel}>TOTAL VALUE</Text>
            <Text style={styles.totalValue}>${portfolio.total_value?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || "0.00"}</Text>
            <View style={styles.plRow}>
              <Text style={[styles.plText, { color: totalPlColor }]}>
                {portfolio.total_pl >= 0 ? "+" : ""}${Math.abs(portfolio.total_pl || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </Text>
              <View style={[styles.plBadge, { backgroundColor: totalPlColor + "22", borderColor: totalPlColor + "44" }]}>
                <Text style={[styles.plBadgeText, { color: totalPlColor }]}>
                  {portfolio.total_pl_pct >= 0 ? "+" : ""}{(portfolio.total_pl_pct || 0).toFixed(2)}%
                </Text>
              </View>
            </View>
            <Text style={styles.costText}>Cost basis ${portfolio.total_cost?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || "0.00"}</Text>
          </Card>

          {hasHoldings ? (
            <>
              {/* Analysis CTA */}
              <Card style={styles.analysisCta}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.metaLabel}>AI ANALYSIS</Text>
                  <Text style={styles.analysisCtaTitle}>
                    {analysis?.analysis?.health_score != null ? "Refresh analysis" : "Analyze my portfolio"}
                  </Text>
                  <Text style={styles.analysisCtaBody}>Get diversification, risk & improvements.</Text>
                </View>
                <TouchableOpacity
                  style={styles.analyzeBtn}
                  onPress={runAnalysis}
                  disabled={analyzing}
                  testID="run-analysis-button"
                >
                  <Text style={styles.analyzeBtnText}>{analyzing ? "Analyzing…" : "Analyze"}</Text>
                </TouchableOpacity>
              </Card>

              {analysis?.analysis?.health_score != null ? (
                <AnalysisCards a={analysis.analysis} />
              ) : null}

              <SectionHeader title="Your Holdings" />
              <Card style={styles.listCard}>
                {portfolio.holdings.map((h: any, i: number) => (
                  <View key={h.symbol} style={i > 0 && styles.divider}>
                    <HoldingRow holding={h} onDelete={async () => { await deleteHolding(h.symbol); load(); }} />
                  </View>
                ))}
              </Card>
            </>
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="briefcase-outline" size={28} color={colors.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>Build your portfolio</Text>
              <Text style={styles.emptyBody}>Add the stocks you own and let your AI copilot grade diversification, concentration, and risk.</Text>
              <TouchableOpacity style={styles.emptyCta} onPress={() => setAddOpen(true)} testID="empty-add-holding">
                <Text style={styles.emptyCtaText}>Add First Holding</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      <AddHoldingModal visible={addOpen} onClose={() => setAddOpen(false)} onAdded={() => { setAddOpen(false); load(); }} />
    </SafeAreaView>
  );
}

function HoldingRow({ holding, onDelete }: { holding: any; onDelete: () => void }) {
  const plColor = changeColor(holding.pl_pct);
  return (
    <View style={styles.holdingRow}>
      <View style={{ flex: 1 }}>
        <View style={styles.holdingTitleLine}>
          <Text style={styles.holdingSymbol}>{holding.symbol.replace(".NS", "")}</Text>
          <View style={[styles.sectorChip]}>
            <Text style={styles.sectorChipText} numberOfLines={1}>{holding.sector}</Text>
          </View>
        </View>
        <Text style={styles.holdingSub}>{holding.shares} × ${holding.current_price.toFixed(2)} · avg ${holding.avg_price.toFixed(2)}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.holdingValue}>${holding.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
        <Text style={[styles.holdingPl, { color: plColor }]}>{holding.pl_pct >= 0 ? "+" : ""}{holding.pl_pct.toFixed(2)}%</Text>
        <TouchableOpacity onPress={onDelete} style={styles.removeIcon} testID={`remove-holding-${holding.symbol}`}>
          <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AnalysisCards({ a }: { a: any }) {
  return (
    <>
      <Card style={styles.scoreCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.metaLabel}>HEALTH SCORE</Text>
          <Text style={[styles.scoreVal, { color: sentimentColor(a.health_score) }]}>{a.health_score}<Text style={styles.scoreUnit}> /100</Text></Text>
        </View>
        <View style={styles.vDivider} />
        <View style={{ flex: 1 }}>
          <Text style={styles.metaLabel}>DIVERSIFICATION</Text>
          <Text style={[styles.scoreVal, { color: sentimentColor(a.diversification_score) }]}>{a.diversification_score}<Text style={styles.scoreUnit}> /100</Text></Text>
        </View>
      </Card>

      <Card style={styles.analysisCard}>
        <Text style={styles.metaLabel}>CONCENTRATION RISK</Text>
        <View style={styles.concentrationRow}>
          <RiskBadge level={a.concentration_risk} />
          <Text style={styles.concentrationText}>{a.concentration_explanation}</Text>
        </View>
      </Card>

      {a.summary ? (
        <Card style={styles.analysisCard}>
          <Text style={styles.metaLabel}>OVERVIEW</Text>
          <Text style={styles.summaryText}>{a.summary}</Text>
        </Card>
      ) : null}

      {a.sector_allocation?.length ? (
        <Card style={styles.analysisCard}>
          <Text style={styles.metaLabel}>SECTOR ALLOCATION</Text>
          {a.sector_allocation.map((s: any, i: number) => (
            <View key={i} style={styles.sectorRow}>
              <Text style={styles.sectorName}>{s.sector}</Text>
              <View style={styles.sectorBar}>
                <View style={[styles.sectorFill, { width: `${Math.min(100, s.weight_pct)}%` }]} />
              </View>
              <Text style={styles.sectorPct}>{s.weight_pct?.toFixed(1)}%</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {a.suggested_improvements?.length ? (
        <Card style={styles.analysisCard}>
          <Text style={styles.metaLabel}>SUGGESTED IMPROVEMENTS</Text>
          {a.suggested_improvements.map((s: string, i: number) => (
            <View key={i} style={styles.suggBullet}>
              <Ionicons name="arrow-forward-circle" size={16} color={colors.accent} style={{ marginTop: 2 }} />
              <Text style={styles.suggText}>{s}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {a.strengths?.length || a.weaknesses?.length ? (
        <View style={styles.swRow}>
          <Card style={[styles.swCard, { borderColor: colors.buy + "33" }]}>
            <Text style={[styles.metaLabel, { color: colors.buy }]}>STRENGTHS</Text>
            {(a.strengths || []).map((s: string, i: number) => (
              <Text key={i} style={styles.swItem}>• {s}</Text>
            ))}
          </Card>
          <Card style={[styles.swCard, { borderColor: colors.sell + "33" }]}>
            <Text style={[styles.metaLabel, { color: colors.sell }]}>WEAKNESSES</Text>
            {(a.weaknesses || []).map((s: string, i: number) => (
              <Text key={i} style={styles.swItem}>• {s}</Text>
            ))}
          </Card>
        </View>
      ) : null}
    </>
  );
}

function RiskBadge({ level }: { level: string }) {
  const c = level === "HIGH" ? colors.sell : level === "MEDIUM" ? colors.hold : colors.buy;
  return (
    <View style={[styles.riskBadge, { backgroundColor: c + "22", borderColor: c + "44" }]}>
      <Text style={[styles.riskBadgeText, { color: c }]}>{level}</Text>
    </View>
  );
}

function AddHoldingModal({ visible, onClose, onAdded }: { visible: boolean; onClose: () => void; onAdded: () => void }) {
  const [step, setStep] = useState<"search" | "details">("search");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!visible) {
      setStep("search"); setSelectedSymbol(""); setShares(""); setAvgPrice(""); setQ(""); setResults([]);
    }
  }, [visible]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 1) { setResults([]); return; }
      try { const r = await searchStocks(q.trim()); setResults(r.results || []); } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const submit = async () => {
    const s = parseFloat(shares);
    const p = parseFloat(avgPrice);
    if (!selectedSymbol || isNaN(s) || isNaN(p) || s <= 0 || p <= 0) return;
    try {
      await addHolding(selectedSymbol, s, p);
      onAdded();
    } catch (e) { console.warn("add holding", e); }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{step === "search" ? "Pick a stock" : `Add ${selectedSymbol}`}</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ color: colors.textSecondary }}>Cancel</Text></TouchableOpacity>
          </View>
          {step === "search" ? (
            <>
              <View style={styles.modalSearchRow}>
                <Ionicons name="search" size={18} color={colors.textSecondary} />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Search stock…"
                  placeholderTextColor={colors.textTertiary}
                  autoFocus value={q} onChangeText={setQ}
                  autoCapitalize="characters" autoCorrect={false}
                  testID="portfolio-search-input"
                />
              </View>
              <ScrollView keyboardShouldPersistTaps="handled">
                {results.map((r) => (
                  <TouchableOpacity
                    key={r.symbol}
                    style={styles.resultRow}
                    onPress={() => { setSelectedSymbol(r.symbol); setStep("details"); }}
                    testID={`portfolio-add-${r.symbol}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultSymbol}>{r.symbol}</Text>
                      <Text style={styles.resultName} numberOfLines={1}>{r.name}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : (
            <View style={styles.formCol}>
              <View>
                <Text style={styles.formLabel}>Shares</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 10"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  value={shares}
                  onChangeText={setShares}
                  testID="shares-input"
                />
              </View>
              <View>
                <Text style={styles.formLabel}>Avg buy price (per share)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 175.50"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  value={avgPrice}
                  onChangeText={setAvgPrice}
                  testID="avg-price-input"
                />
              </View>
              <TouchableOpacity style={styles.submitBtn} onPress={submit} testID="submit-holding">
                <Text style={styles.submitBtnText}>Add to Portfolio</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
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
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.textPrimary, alignItems: "center", justifyContent: "center" },
  summaryCard: { marginHorizontal: spacing.md, alignItems: "flex-start", gap: 6 },
  metaLabel: { color: colors.textTertiary, fontSize: 10, letterSpacing: 2, fontWeight: fontWeight.bold, marginBottom: 6 },
  totalValue: { color: colors.textPrimary, fontSize: 36, fontWeight: fontWeight.black, letterSpacing: -1, fontVariant: ["tabular-nums"] },
  plRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  plText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, fontVariant: ["tabular-nums"] },
  plBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1 },
  plBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 0.3, fontVariant: ["tabular-nums"] },
  costText: { color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 4 },
  analysisCta: {
    marginHorizontal: spacing.md, marginTop: spacing.sm,
    flexDirection: "row", alignItems: "center", gap: spacing.md,
  },
  analysisCtaTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold, marginTop: 4 },
  analysisCtaBody: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  analyzeBtn: { backgroundColor: colors.accent, paddingHorizontal: 18, paddingVertical: 12, borderRadius: radius.pill },
  analyzeBtnText: { color: colors.bg, fontWeight: fontWeight.bold, fontSize: fontSize.xs, letterSpacing: 0.5 },
  scoreCard: { marginHorizontal: spacing.md, marginTop: spacing.sm, flexDirection: "row", gap: spacing.md },
  vDivider: { width: 1, backgroundColor: colors.border, marginVertical: -spacing.md },
  scoreVal: { fontSize: 32, fontWeight: fontWeight.black, letterSpacing: -0.5 },
  scoreUnit: { color: colors.textTertiary, fontSize: fontSize.sm, fontWeight: fontWeight.regular },
  analysisCard: { marginHorizontal: spacing.md, marginTop: spacing.sm },
  concentrationRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  concentrationText: { flex: 1, color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 18 },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm, borderWidth: 1 },
  riskBadgeText: { fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 1 },
  summaryText: { color: colors.textAccent, fontSize: fontSize.sm, lineHeight: 22 },
  sectorRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  sectorName: { color: colors.textPrimary, fontSize: fontSize.xs, width: 92 },
  sectorBar: { flex: 1, height: 6, backgroundColor: colors.surfaceElevated, borderRadius: 3, overflow: "hidden" },
  sectorFill: { height: "100%", backgroundColor: colors.accent, borderRadius: 3 },
  sectorPct: { color: colors.textSecondary, fontSize: fontSize.xs, width: 48, textAlign: "right", fontVariant: ["tabular-nums"] },
  suggBullet: { flexDirection: "row", gap: 10, paddingVertical: 6 },
  suggText: { flex: 1, color: colors.textAccent, fontSize: fontSize.sm, lineHeight: 20 },
  swRow: { flexDirection: "row", marginHorizontal: spacing.md - 6, marginTop: spacing.sm, gap: 8 },
  swCard: { flex: 1, marginHorizontal: 0, borderColor: colors.border, padding: spacing.md, marginLeft: 6 },
  swItem: { color: colors.textAccent, fontSize: fontSize.xs, lineHeight: 18, marginBottom: 4 },
  listCard: { marginHorizontal: spacing.md },
  divider: { borderTopColor: colors.border, borderTopWidth: 1 },
  holdingRow: { flexDirection: "row", paddingVertical: spacing.sm + 4, paddingHorizontal: spacing.xs, gap: spacing.sm },
  holdingTitleLine: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  holdingSymbol: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  sectorChip: { backgroundColor: colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm, maxWidth: 130 },
  sectorChipText: { color: colors.textSecondary, fontSize: 10, letterSpacing: 0.3 },
  holdingSub: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 4 },
  holdingValue: { color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold, fontVariant: ["tabular-nums"] },
  holdingPl: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, marginTop: 2, fontVariant: ["tabular-nums"] },
  removeIcon: { marginTop: 6, padding: 4 },
  empty: { alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: 32, gap: spacing.md },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  emptyBody: { color: colors.textSecondary, textAlign: "center", lineHeight: 22, fontSize: fontSize.sm },
  emptyCta: { marginTop: spacing.md, backgroundColor: colors.textPrimary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: radius.pill },
  emptyCtaText: { color: colors.bg, fontWeight: fontWeight.bold, fontSize: fontSize.sm, letterSpacing: 0.5 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomColor: colors.border, borderBottomWidth: 1,
  },
  modalTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  modalSearchRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomColor: colors.border, borderBottomWidth: 1,
  },
  modalInput: { flex: 1, color: colors.textPrimary, fontSize: fontSize.base, paddingVertical: 10 },
  resultRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    borderBottomColor: colors.border, borderBottomWidth: 1,
  },
  resultSymbol: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  resultName: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  formCol: { padding: spacing.md, gap: spacing.md },
  formLabel: { color: colors.textTertiary, fontSize: 10, letterSpacing: 2, fontWeight: fontWeight.bold, marginBottom: 6 },
  formInput: {
    color: colors.textPrimary, fontSize: fontSize.lg,
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
    borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14,
    fontVariant: ["tabular-nums"],
  },
  submitBtn: {
    marginTop: spacing.md, backgroundColor: colors.textPrimary,
    paddingVertical: 16, borderRadius: radius.pill, alignItems: "center",
  },
  submitBtnText: { color: colors.bg, fontWeight: fontWeight.bold, fontSize: fontSize.sm, letterSpacing: 0.5 },
});
