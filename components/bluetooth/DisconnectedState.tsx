import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity } from "react-native";
import PeripheralList from "./PeripheralList";

interface DisconnectedStateProps {
  peripherals: any[];
  isScanning: boolean;
  onScanPress: () => void;
  onConnect: (peripheral: any) => Promise<void>;
}

const DisconnectedState: React.FunctionComponent<DisconnectedStateProps> = ({
  isScanning,
  onScanPress,
  peripherals,
  onConnect,
}) => {
  const prevIsScanning = useRef(isScanning);

  useEffect(() => {
    // When isScanning changes from true to false, show a toast or console message
    if (prevIsScanning.current && !isScanning) {
      // console.log("Scan completed");
      // Optionally show user feedback that scan has completed
    }
    prevIsScanning.current = isScanning;
  }, [isScanning]);

  return (
    <>
      <TouchableOpacity style={styles.scanButton} onPress={onScanPress}>
        <Text style={styles.scanButtonText}>
          {isScanning ? "Scanning..." : "Start Scan"}
        </Text>
      </TouchableOpacity>
      {peripherals.length > 0 && (
        <PeripheralList onConnect={onConnect} peripherals={peripherals} />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  scanButton: {
    backgroundColor: "#ff0000",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  scanButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default DisconnectedState;
