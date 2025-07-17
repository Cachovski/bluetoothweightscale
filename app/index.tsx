import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react"; // Added useEffect and useRef
import { Platform, StyleSheet, Text, View } from "react-native";
import DisconnectedState from "../components/bluetooth/DisconnectedState";
import { useBLEContext } from "../contexts/BLEContext";
import {
  borderRadius,
  colors,
  commonStyles,
  spacing,
} from "../utils/commonStyles";

export default function Index() {
  const router = useRouter();
  const {
    isScanning,
    peripherals,
    isConnected,
    bleService,
    weightData,
    startScan,
    connectToPeripheral,
    disconnectFromPeripheral,
  } = useBLEContext();

  // Track previous connection state to detect disconnections
  const prevConnectedRef = useRef(false);

  // Detect when connection is lost and return to scan screen
  useEffect(() => {
    // If we were connected before but now we're not, we got disconnected
    if (prevConnectedRef.current && !isConnected) {
      // console.log("❌ Bluetooth connection lost, returning to scan screen");

      try {
        // Force navigate to home screen, ignoring router state
        router.replace("/");
      } catch (err) {
        console.error("Navigation error:", err);
        // Last resort - reload app
        if (Platform.OS === "web") {
          window.location.href = "/";
        }
      }
    }

    // Update our reference of the previous state
    prevConnectedRef.current = isConnected;
  }, [isConnected, router]);

  // Adapter function for connecting to peripherals
  const handleConnect = async (peripheral: any): Promise<void> => {
    // Extract the peripheral ID and pass it to your connectToPeripheral function
    const peripheralId = peripheral.id;
    await connectToPeripheral(peripheralId);
    // No return value needed (void)
  };

  return (
    <View style={commonStyles.container}>
      {/* Scan Screen Only */}
      <View style={styles.mainContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Bluetooth Weight Scale</Text>
          <Text style={styles.subtitle}>
            Connect to your scale to get started
          </Text>
        </View>

        <DisconnectedState
          peripherals={Array.from(peripherals.values())}
          isScanning={isScanning}
          onScanPress={startScan}
          onConnect={handleConnect}
        />
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
  headerContainer: {
    alignItems: "center",
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
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
  // Added flexSpacer to push the disconnect button to the bottom
  flexSpacer: {
    flex: 1,
  },
  actionButton: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: "#ff0000",
  },
  // Kept other styles for consistency
  navButton: {
    backgroundColor: colors.secondary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.xl,
  },
  navButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginRight: spacing.sm,
  },
});
