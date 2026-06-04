import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { colors, fontSize, fontWeight, radius, spacing, changeColor } from "@/src/theme";
import { SignalPill } from "./SignalPill";

interface Props {
  symbol: string;
  name?: string;
  price?: number;
  change_pct?: number;
  currency?: string;
  recommendation?: string | null;
  subtitle?: string;
  reasons?: string[];
  right?: React.ReactNode;
  testID?: string;
}

export function StockRow({ symbol, name, price, change_pct, currency = "USD", recommendation, subtitle, reasons, right, testID }: Props) {
  const router = useRouter();
  const chColor = changeColor(change_pct);
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.row}
      onPress={() => router.push(`/stock/${symbol}` as any)}
      testID={testID || `stock-row-${symbol}`}
    >
      <View style={styles.left}>
        <View style={styles.titleLine}>
          <Text style={styles.symbol}>{symbol.replace(".NS", "")}</Text>
          {recommendation ? <SignalPill recommendation={recommendation} /> : null}
        </View>
        {name ? <Text style={styles.name} numberOfLines={1}>{name}</Text> : null}
        {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
        {reasons && reasons.length > 0 ? (
          <View style={styles.reasons}>
            {reasons.slice(0, 3).map((r, i) => (
              <View key={i} style={styles.reasonChip}>
                <Text style={styles.reasonText} numberOfLines={1}>{r}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.right}>
        {price != null ? (
          <Text style={styles.price}>
            {currency === "INR" ? "₹" : "$"}{price.toFixed(2)}
          </Text>
        ) : null}
        {change_pct != null ? (
          <Text style={[styles.change, { color: chColor }]}>
            {change_pct >= 0 ? "+" : ""}{change_pct.toFixed(2)}%
          </Text>
        ) : null}
        {right}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  left: { flex: 1, gap: 4 },
  titleLine: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  symbol: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
  name: { color: colors.textSecondary, fontSize: fontSize.xs },
  subtitle: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },
  reasons: { flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" },
  reasonChip: { backgroundColor: colors.surfaceElevated, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  reasonText: { color: colors.textSecondary, fontSize: 10 },
  right: { alignItems: "flex-end", gap: 2 },
  price: { color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold, fontVariant: ["tabular-nums"] },
  change: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, fontVariant: ["tabular-nums"] },
});
