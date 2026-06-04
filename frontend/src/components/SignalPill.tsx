import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fontSize, fontWeight, radius, signalColor } from "@/src/theme";

export function SignalPill({ recommendation, testID }: { recommendation?: string | null; testID?: string }) {
  const c = signalColor(recommendation);
  return (
    <View style={[styles.pill, { backgroundColor: c.bg, borderColor: c.fg + "33" }]} testID={testID}>
      <View style={[styles.dot, { backgroundColor: c.fg }]} />
      <Text style={[styles.text, { color: c.fg }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 999 },
  text: { fontSize: fontSize.xxs, fontWeight: fontWeight.bold, letterSpacing: 1.2 },
});
