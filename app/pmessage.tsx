import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import WeightDisplay from "../components/WeightDisplay";
import { useBLEContext } from "../contexts/BLEContext";
import {
    borderRadius,
    colors,
    commonStyles,
    spacing,
} from "../utils/commonStyles";

export default function PMessage() {
  const { bleService, weightData } = useBLEContext();

  return (
    <View style={commonStyles.container}>
      <View style={styles.mainContent}>
        <View style={styles.weightDisplayContainer}>
          <WeightDisplay weightData={weightData} />
        </View>

        <View style={styles.connectionInfo}>
          <Text style={styles.connectionText}>
            Connected to:{" "}
            {bleService?.peripheralId?.substring(0, 12) || "Unknown"}...
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  weightDisplayContainer: {
    marginVertical: spacing.xl,
    alignItems: "center",
  },
  connectionInfo: {
    backgroundColor: "rgba(0,122,255,0.1)",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginVertical: spacing.md,
    alignItems: "center",
  },
  connectionText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
});
