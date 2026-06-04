import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { colors, fontSize, spacing } from "@/src/theme";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.textSecondary} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.xl, alignItems: "center", gap: spacing.sm },
  text: { color: colors.textTertiary, fontSize: fontSize.sm },
});
