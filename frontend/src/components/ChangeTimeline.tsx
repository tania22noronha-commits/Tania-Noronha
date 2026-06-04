import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontSize, fontWeight, radius, spacing, changeColor, signalColor } from "@/src/theme";
import { Card } from "./Card";

interface Snap {
  date: string;
  price?: number;
  recommendation?: string;
  confidence?: number;
}

interface Props {
  diff: any;
  history: Snap[];
}

/**
 * "What changed since yesterday" — diff card + N-day history rail.
 * Only renders when there is at least one snapshot. When there is no
 * previous snapshot, we show a friendly "first read" empty state.
 */
export function ChangeTimeline({ diff, history }: Props) {
  if (!history || history.length === 0) return null;

  const hasPrev = diff?.has_previous;

  return (
    <Card style={styles.card} testID="change-timeline">
      <View style={styles.titleRow}>
        <Ionicons name="time-outline" size={16} color={colors.gold} />
        <Text style={styles.title}>WHAT CHANGED</Text>
      </View>

      {hasPrev ? (
        <View style={{ gap: 10 }}>
          {/* Headline change */}
          {diff.recommendation_changed ? (
            <RecChange prev={diff.prev_recommendation} now={diff.today_recommendation} />
          ) : (
            <NoRecChange rec={diff.today_recommendation} />
          )}

          {/* Stat row */}
          <View style={styles.statRow}>
            <Stat
              label="PRICE"
              value={
                diff.price_delta_pct != null
                  ? `${diff.price_delta_pct >= 0 ? "+" : ""}${diff.price_delta_pct.toFixed(2)}%`
                  : "—"
              }
              color={changeColor(diff.price_delta_pct)}
            />
            <Stat
              label="CONFIDENCE"
              value={
                diff.confidence_delta != null
                  ? `${diff.confidence_delta >= 0 ? "+" : ""}${diff.confidence_delta}`
                  : "—"
              }
              color={changeColor(diff.confidence_delta)}
            />
            <Stat
              label="VS"
              value={diff.prev_date?.slice(5) || "—"}
              color={colors.textSecondary}
            />
          </View>

          {/* New risks/opportunities */}
          {diff.new_opportunities?.length ? (
            <DeltaList label="New opportunities" items={diff.new_opportunities} tone="buy" />
          ) : null}
          {diff.new_risks?.length ? (
            <DeltaList label="New risks" items={diff.new_risks} tone="sell" />
          ) : null}
          {diff.dropped_risks?.length ? (
            <DeltaList label="Risks cleared" items={diff.dropped_risks} tone="muted" />
          ) : null}
        </View>
      ) : (
        <Text style={styles.firstRead}>
          First analysis on file. We'll track changes from your next visit.
        </Text>
      )}

      {/* History rail */}
      {history.length >= 2 ? (
        <View style={styles.histWrap}>
          <Text style={styles.histLabel}>RECENT READS</Text>
          {history.map((h, i) => (
            <HistoryRow key={h.date} snap={h} isFirst={i === 0} isLast={i === history.length - 1} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function RecChange({ prev, now }: { prev: string; now: string }) {
  const pColor = signalColor(prev);
  const nColor = signalColor(now);
  return (
    <View style={styles.recChange} testID="recommendation-changed">
      <View style={[styles.recPill, { backgroundColor: pColor.bg, borderColor: pColor.fg + "44" }]}>
        <Text style={[styles.recPillText, { color: pColor.fg, textDecorationLine: "line-through" }]}>
          {pColor.label}
        </Text>
      </View>
      <Ionicons name="arrow-forward" size={14} color={colors.textTertiary} />
      <View style={[styles.recPill, { backgroundColor: nColor.bg, borderColor: nColor.fg + "44" }]}>
        <Text style={[styles.recPillText, { color: nColor.fg }]}>{nColor.label}</Text>
      </View>
      <Text style={styles.recChangeNote}>Conviction shifted</Text>
    </View>
  );
}

function NoRecChange({ rec }: { rec: string }) {
  const c = signalColor(rec);
  return (
    <View style={styles.noChange}>
      <View style={[styles.dot, { backgroundColor: c.fg }]} />
      <Text style={styles.noChangeText}>
        Still <Text style={{ color: c.fg, fontWeight: fontWeight.bold }}>{c.label}</Text> · no conviction change
      </Text>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function DeltaList({ label, items, tone }: { label: string; items: string[]; tone: "buy" | "sell" | "muted" }) {
  const c = tone === "buy" ? colors.buy : tone === "sell" ? colors.sell : colors.textTertiary;
  return (
    <View>
      <Text style={[styles.deltaLabel, { color: c }]}>{label}</Text>
      {items.slice(0, 3).map((it, i) => (
        <View key={i} style={styles.deltaItem}>
          <View style={[styles.deltaDot, { backgroundColor: c }]} />
          <Text
            style={[
              styles.deltaText,
              tone === "muted" && { textDecorationLine: "line-through", color: colors.textTertiary },
            ]}
          >
            {it}
          </Text>
        </View>
      ))}
    </View>
  );
}

function HistoryRow({ snap, isFirst, isLast }: { snap: Snap; isFirst: boolean; isLast: boolean }) {
  const c = signalColor(snap.recommendation);
  return (
    <View style={styles.histRow}>
      <View style={styles.histRail}>
        <View style={[styles.histDot, { backgroundColor: c.fg, borderColor: isFirst ? c.fg : colors.surface }]} />
        {!isLast ? <View style={styles.histLine} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: isLast ? 0 : 14 }}>
        <View style={styles.histTop}>
          <Text style={styles.histDate}>{snap.date}</Text>
          {snap.recommendation ? (
            <View style={[styles.histPill, { backgroundColor: c.bg, borderColor: c.fg + "44" }]}>
              <Text style={[styles.histPillText, { color: c.fg }]}>{c.label}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.histSub}>
          {snap.price != null ? (
            <Text style={styles.histPrice}>${snap.price.toFixed(2)}</Text>
          ) : null}
          {snap.confidence != null ? (
            <Text style={styles.histConf}>· conf {snap.confidence}%</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.md, marginTop: spacing.sm, gap: spacing.sm },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: colors.textPrimary, fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 2 },
  recChange: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  recPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1 },
  recPillText: { fontSize: 11, fontWeight: fontWeight.bold, letterSpacing: 1.2 },
  recChangeNote: { color: colors.textSecondary, fontSize: fontSize.xs, marginLeft: 4 },
  noChange: { flexDirection: "row", alignItems: "center", gap: 8 },
  noChangeText: { color: colors.textSecondary, fontSize: fontSize.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statRow: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1, backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12,
  },
  statLabel: { color: colors.textTertiary, fontSize: 9, letterSpacing: 1.5, fontWeight: fontWeight.bold },
  statValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginTop: 4, letterSpacing: -0.3, fontVariant: ["tabular-nums"] },
  deltaLabel: { fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 1.2, marginTop: 6, marginBottom: 4 },
  deltaItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 3 },
  deltaDot: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
  deltaText: { flex: 1, color: colors.textAccent, fontSize: fontSize.xs, lineHeight: 18 },
  firstRead: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, paddingVertical: 4 },
  histWrap: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopColor: colors.border, borderTopWidth: 1 },
  histLabel: { color: colors.textTertiary, fontSize: 10, letterSpacing: 1.5, fontWeight: fontWeight.bold, marginBottom: 10 },
  histRow: { flexDirection: "row", gap: 12 },
  histRail: { width: 16, alignItems: "center" },
  histDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, borderWidth: 2 },
  histLine: { width: 1, flex: 1, backgroundColor: colors.border, marginTop: 2 },
  histTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  histDate: { color: colors.textPrimary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, fontVariant: ["tabular-nums"] },
  histPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1 },
  histPillText: { fontSize: 9, fontWeight: fontWeight.bold, letterSpacing: 1 },
  histSub: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  histPrice: { color: colors.textSecondary, fontSize: fontSize.xs, fontVariant: ["tabular-nums"] },
  histConf: { color: colors.textTertiary, fontSize: fontSize.xs },
});
