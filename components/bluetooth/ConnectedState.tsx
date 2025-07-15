import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PeripheralServices } from "../../types/bluetooth";

interface ConnectedStateProps {
  bleService: PeripheralServices;
  onCommands: () => void;
  onDisconnect: (id: string) => void;
}

const ConnectedState: React.FunctionComponent<ConnectedStateProps> = ({
  bleService,
  onDisconnect,
  onCommands,
}) => {
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.info}>
          Peripheral ID: {bleService.peripheralId}
        </Text>
        <Text style={styles.info}>Service ID: {bleService.serviceId}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={onCommands} style={styles.button}>
          <Text style={styles.buttonText}>COMMANDS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDisconnect(bleService.peripheralId)}
          style={[styles.button, styles.disconnectButton]}
        >
          <Text style={[styles.buttonText, styles.disconnectText]}>
            DISCONNECT
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  info: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: "#ff0000",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  disconnectButton: {
    backgroundColor: "#FF0000",
  },
  disconnectText: {
    color: "#fff",
  },
});

export default ConnectedState;
