import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, fontSize, fontWeight, sentimentColor } from "@/src/theme";

interface Props {
  score: number;
  size?: number;
  label?: string;
  testID?: string;
}

export function SentimentRing({ score, size = 140, label = "Market Sentiment", testID }: Props) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const dash = circumference * pct;
  const color = sentimentColor(score);

  const tone =
    score >= 70 ? "Bullish" : score >= 55 ? "Lean Bullish" :
    score >= 45 ? "Neutral"  : score >= 30 ? "Lean Bearish" : "Bearish";

  return (
    <View style={styles.wrap} testID={testID}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={colors.border} strokeWidth={stroke} fill="transparent" />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={`${dash}, ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <View style={[styles.center, { width: size, height: size }]} pointerEvents="none">
        <Text style={[styles.score, { color }]}>{score}</Text>
        <Text style={styles.tone}>{tone}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  center: { position: "absolute", alignItems: "center", justifyContent: "center" },
  score: { fontSize: 38, fontWeight: fontWeight.bold, letterSpacing: -1 },
  tone: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginTop: 2, letterSpacing: 0.5 },
  label: { fontSize: 10, color: colors.textTertiary, marginTop: 4, textTransform: "uppercase", letterSpacing: 1.2 },
});
