import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { COMPort, FrameType } from "./types";

interface FrameSwitchProps {
  frameType: FrameType;
  comPort: COMPort;
  isEnabled: boolean | null; // null means unknown/loading
  onToggle: (frameType: FrameType, comPort: COMPort, newValue: boolean) => void;
  isLoading?: boolean;
}

export default function FrameSwitch({
  frameType,
  comPort,
  isEnabled,
  onToggle,
  isLoading = false,
}: FrameSwitchProps) {
  const handleToggle = (newValue: boolean) => {
    onToggle(frameType, comPort, newValue);
  };

  // Debug logging to understand switch state
  //console.log(`FrameSwitch ${frameType} ${comPort}: isEnabled=${isEnabled}, isLoading=${isLoading}`);

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.frameLabel}>{frameType} Frame</Text>
        {/* Debug text to show current state */}
        <Text style={styles.debugText}>
          State: {isEnabled === null ? 'Unknown' : isEnabled ? 'Enabled' : 'Disabled'}
        </Text>
      </View>
      <View style={styles.switchContainer}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#ff0000" />
        ) : (
          <Switch
            value={isEnabled === true}
            onValueChange={handleToggle}
            trackColor={{ false: "#ddd", true: "#ff0000" }}
            thumbColor={isEnabled === true ? "#fff" : "#f4f3f4"}
            disabled={isEnabled === null}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  labelContainer: {
    flex: 1,
  },
  frameLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  debugText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  comLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  switchContainer: {
    minWidth: 50,
    alignItems: "center",
  },
});
