import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useBLEContext } from "../contexts/BLEContext";

export default function PPCommandsScreen() {

  const [sending, setSending] = useState(false);
  const ble = useBLEContext();

  // Example placeholder commands for PP
  const ppCommands = [
    { title: "PP Command 1", command: "pp_cmd_1" },
    { title: "PP Command 2", command: "pp_cmd_2" },
    { title: "PP Command 3", command: "pp_cmd_3" },
  ];

  const handlePPCommand = async (cmd: string) => {
    if (!ble || !ble.bleService) {
      alert("Not connected to a device");
      return;
    }
    setSending(true);
    try {
      // Find DD08 characteristic
      const dd08 = ble.bleService?.characteristics.find(c =>
        c.uuid.toLowerCase() === ble.bleService?.characteristics[0]?.uuid.toLowerCase().replace(/dd0[1-5]/, "dd08") ||
        c.uuid.toLowerCase() === "0000dd08-0000-1000-8000-00805f9b34fb"
      );
      if (!dd08) throw new Error("DD08 characteristic not found");
      // Send command as ASCII string (base64 handled in BLE logic)
      await ble.sendTCommand(cmd);
    } catch (e: any) {
      alert(e.message || "Failed to send command");
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>PP Commands</Text>
      <View style={styles.commandsContainer}>
        {ppCommands.map((btn, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.commandButton}
            onPress={() => handlePPCommand(btn.command)}
          >
            <Text style={styles.buttonText}>{btn.title}</Text>
            <Text style={styles.commandText}>{btn.command}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.responseSection}>
        <Text style={styles.responseText}>
          {sending ? "Sending..." : ble?.ppResponse || "No response yet."}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  commandsContainer: {
    marginBottom: 20,
  },
  commandButton: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  commandText: {
    fontSize: 12,
    color: "#666",
  },
  responseSection: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  responseText: {
    fontSize: 14,
    color: "#333",
  },
});
