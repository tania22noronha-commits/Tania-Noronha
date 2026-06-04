import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { colors, fontSize, fontWeight, radius, spacing } from "@/src/theme";
import { Card } from "@/src/components/Card";
import { StockRow } from "@/src/components/StockRow";
import { LoadingState } from "@/src/components/LoadingState";
import { getWatchlist, addWatchlist, removeWatchlist, searchStocks } from "@/src/api";

export default function WatchlistScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await getWatchlist();
      setItems(d.items || []);
    } catch (e) {
      console.warn("watchlist", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleRemove = async (sym: string) => {
    await removeWatchlist(sym);
    load();
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>TRACKED</Text>
          <Text style={styles.title}>Watchlist</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)} testID="add-to-watchlist-button">
          <Ionicons name="add" size={22} color={colors.bg} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState
          icon="star-outline"
          title="No stocks yet"
          body="Add stocks to track AI recommendations, trends, and news impact in one place."
          ctaLabel="Add Your First Stock"
          onPress={() => setAddOpen(true)}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32, paddingTop: 4 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
        >
          <Card style={styles.listCard}>
            {items.map((q, i) => (
              <View key={q.symbol} style={i > 0 && styles.divider}>
                <StockRow
                  symbol={q.symbol}
                  name={q.name}
                  price={q.price}
                  change_pct={q.change_pct}
                  currency={q.currency}
                  recommendation={q.recommendation}
                  testID={`watchlist-row-${q.symbol}`}
                  right={
                    <TouchableOpacity
                      onPress={() => handleRemove(q.symbol)}
                      style={styles.removeBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      testID={`remove-${q.symbol}`}
                    >
                      <Ionicons name="close" size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                  }
                />
              </View>
            ))}
          </Card>
        </ScrollView>
      )}

      <AddStockModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => { setAddOpen(false); load(); }}
      />
    </SafeAreaView>
  );
}

function EmptyState({ icon, title, body, ctaLabel, onPress }: any) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      <TouchableOpacity style={styles.emptyCta} onPress={onPress} testID="empty-cta">
        <Text style={styles.emptyCtaText}>{ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function AddStockModal({ visible, onClose, onAdded }: { visible: boolean; onClose: () => void; onAdded: (symbol: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) { setQ(""); setResults([]); }
  }, [visible]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 1) { setResults([]); return; }
      setBusy(true);
      try { const r = await searchStocks(q.trim()); setResults(r.results || []); }
      catch { setResults([]); }
      finally { setBusy(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const choose = async (sym: string) => {
    try {
      await addWatchlist(sym);
      onAdded(sym);
    } catch (e) {
      console.warn("add", e);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
        <View style={styles.modalHeader}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.modalInput}
            placeholder="Search stocks…"
            placeholderTextColor={colors.textTertiary}
            autoFocus
            value={q}
            onChangeText={setQ}
            autoCapitalize="characters"
            autoCorrect={false}
            testID="watchlist-search-input"
          />
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.textSecondary }}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
          {busy ? <LoadingState label="Searching…" /> : null}
          {results.map((r) => (
            <TouchableOpacity
              key={r.symbol}
              style={styles.resultRow}
              onPress={() => choose(r.symbol)}
              testID={`add-result-${r.symbol}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.resultSymbol}>{r.symbol}</Text>
                <Text style={styles.resultName} numberOfLines={1}>{r.name}</Text>
              </View>
              <Ionicons name="add-circle" size={22} color={colors.buy} />
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
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  brand: { color: colors.gold, fontSize: 11, letterSpacing: 3, fontWeight: fontWeight.bold },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: fontWeight.bold, marginTop: 4, letterSpacing: -0.5 },
  addBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.textPrimary,
    alignItems: "center", justifyContent: "center",
  },
  listCard: { marginHorizontal: spacing.md },
  divider: { borderTopColor: colors.border, borderTopWidth: 1 },
  removeBtn: { marginTop: 4 },
  empty: { alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: 64, gap: spacing.md },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginTop: 4 },
  emptyBody: { color: colors.textSecondary, textAlign: "center", lineHeight: 22, fontSize: fontSize.sm },
  emptyCta: { marginTop: spacing.md, backgroundColor: colors.textPrimary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: radius.pill },
  emptyCtaText: { color: colors.bg, fontWeight: fontWeight.bold, fontSize: fontSize.sm, letterSpacing: 0.5 },
  modalHeader: {
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
});
