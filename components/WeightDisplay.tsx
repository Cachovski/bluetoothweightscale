import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WeightData } from '../hooks/useBLE';

interface WeightDisplayProps {
  weightData: WeightData;
}

export default function WeightDisplay({ weightData }: WeightDisplayProps) {
  return (
    <View style={styles.weightDisplay}>
      <Text style={styles.weightText}>
        {weightData.weight} {weightData.unit}
      </Text>
      <View style={styles.statusIndicators}>
        <Text style={[styles.statusText, weightData.isStable ? styles.stable : styles.unstable]}>
          {weightData.isStable ? "🟢 Stable" : "🟡 Measuring..."}
        </Text>
        {/* Show status indicators exactly as they appear in the ST flag */}
        {weightData.isTare && (
          <Text style={styles.statusText}>📊 Tare</Text>
        )}
        {weightData.isZero && (
          <Text style={styles.statusText}>⚖️ Zero</Text>
        )}
        {weightData.isMinimum && (
          <Text style={styles.statusText}>⬇️ Min</Text>
        )}
        {weightData.isNegative && (
          <Text style={styles.statusText}>➖ Negative</Text>
        )}
        {weightData.isFixedTare && (
          <Text style={styles.statusText}>🔒 Fixed Tare</Text>
        )}
        {weightData.hasADCError && (
          <Text style={styles.errorText}>⚠️ Sensor Error</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weightDisplay: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 20,
    alignItems: "center",
    minWidth: 300,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  weightText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  statusIndicators: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    color: "#666",
  },
  stable: {
    backgroundColor: "#e8f5e8",
    color: "#2e7d2e",
  },
  unstable: {
    backgroundColor: "#fff3cd",
    color: "#856404",
  },
  errorText: {
    fontSize: 12,
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#f8d7da",
    color: "#721c24",
  },
});
