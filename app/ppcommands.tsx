import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useBLEContext } from "../contexts/BLEContext";

export default function PPCommandsScreen() {
  const [sending, setSending] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("COM");
  const [selectedCOM, setSelectedCOM] = useState<"COM 1" | "COM 2">("COM 1");
  const [baudModalVisible, setBaudModalVisible] = useState(false);
  const [baudAction, setBaudAction] = useState<"Write" | "Read" | null>(null);
  const ble = useBLEContext();

  // Command categories
  const categories = [
    "COM",
    "Metro Configs",
    "Adjust",
    "Display",
    "Buzzer",
    "Special Configs",
  ];

  // Only show command list for non-COM categories
  const ppCommands = [
    { title: "Metro 1", command: "metro_cmd_1", category: "Metro Configs" },
    { title: "Adjust 1", command: "adjust_cmd_1", category: "Adjust" },
    { title: "Display 1", command: "display_cmd_1", category: "Display" },
    { title: "Buzzer 1", command: "buzzer_cmd_1", category: "Buzzer" },
    {
      title: "Special 1",
      command: "special_cmd_1",
      category: "Special Configs",
    },
    // Add more as needed
  ];
  const filteredCommands = selectedCategory === "COM"
    ? []
    : ppCommands.filter((cmd) => cmd.category === selectedCategory);

  // Helper: Calculate 2's complement checksum (uint8)
  function calculateChecksum(data: number[]): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    sum = sum & 0xff;
    return (~sum + 1) & 0xff;
  }

  // Helper: Build COM command (Write Baudrate/Read Baudrate)
  function buildCOMCommand(com: "COM 1" | "COM 2"): number[] {
    // Format: [DD, DD, 02, 02, 01, 01, 00, data, checksum, 03]
    // data: 0x01 for COM 1, 0x02 for COM 2
    const dataByte = com === "COM 1" ? 0x01 : 0x02;
    const arr = [0xdd, 0xdd, 0x02, 0x02, 0x01, 0x01, 0x00, dataByte];
    const checksum = calculateChecksum(arr);
    return [...arr, checksum, 0x03];
  }

  const handlePPCommand = async (cmd: string) => {
    if (!ble || !ble.bleService) {
      alert("Not connected to a device");
      return;
    }
    setSending(true);
    try {
      // Find DD08 characteristic
      const dd08 = ble.bleService?.characteristics.find(
        (c) =>
          c.uuid.toLowerCase() ===
            ble.bleService?.characteristics[0]?.uuid
              .toLowerCase()
              .replace(/dd0[1-5]/, "dd08") ||
          c.uuid.toLowerCase() === "0000dd08-0000-1000-8000-00805f9b34fb"
      );
      if (!dd08) throw new Error("DD08 characteristic not found");

      // If COM 1 or COM 2, build and send the real command
      if (cmd === "com_cmd_1" || cmd === "com_cmd_2") {
        const com = cmd === "com_cmd_1" ? "COM 1" : "COM 2";
        const bytes = buildCOMCommand(com);
        // Convert to string for sendTCommand (expects string, will be base64 encoded)
        const str = String.fromCharCode(...bytes);
        await ble.sendTCommand(str);
      } else {
        // Fallback: send as before for other commands
        await ble.sendTCommand(cmd);
      }
    } catch (e: any) {
      alert(e.message || "Failed to send command");
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>PP Commands</Text>
      {/* Category selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryButton,
              selectedCategory === cat && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                selectedCategory === cat && styles.categoryButtonTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* COM 1 / COM 2 toggle buttons, only show when COM is selected */}
      {selectedCategory === "COM" && (
        <>
          <View style={styles.comToggleRow}>
            {(["COM 1", "COM 2"] as const).map((com) => (
              <TouchableOpacity
                key={com}
                style={[
                  styles.comToggleButton,
                  selectedCOM === com && styles.comToggleButtonActive,
                ]}
                onPress={() => setSelectedCOM(com)}
              >
                <Text
                  style={[
                    styles.comToggleButtonText,
                    selectedCOM === com && styles.comToggleButtonTextActive,
                  ]}
                >
                  {com}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={styles.baudrateButton}
              onPress={() => setBaudModalVisible(true)}
            >
              <Text style={styles.baudrateButtonText}>Write/Read Baudrate</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Modal for Write/Read Baudrate choice */}
      <Modal
        visible={baudModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBaudModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Action</Text>
            <Pressable
              style={styles.modalButton}
              onPress={() => {
                setBaudAction("Write");
                setBaudModalVisible(false);
                // TODO: handle write baudrate logic
              }}
            >
              <Text style={styles.modalButtonText}>Write Baudrate</Text>
            </Pressable>
            <Pressable
              style={styles.modalButton}
              onPress={() => {
                setBaudAction("Read");
                setBaudModalVisible(false);
                // TODO: handle read baudrate logic
              }}
            >
              <Text style={styles.modalButtonText}>Read Baudrate</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, { backgroundColor: "#eee" }]}
              onPress={() => setBaudModalVisible(false)}
            >
              <Text style={[styles.modalButtonText, { color: "#333" }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Only show command list for non-COM categories */}
      {selectedCategory !== "COM" && (
        <View style={styles.commandsContainer}>
          {filteredCommands.length === 0 ? (
            <Text style={{ textAlign: "center", color: "#888", marginTop: 20 }}>
              No commands in this category.
            </Text>
          ) : (
            filteredCommands.map((btn, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.commandButton}
                onPress={() => handlePPCommand(btn.command)}
              >
                <Text style={styles.buttonText}>{btn.title}</Text>
                <Text style={styles.commandText}>{btn.command}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
      <View style={styles.responseSection}>
        <Text style={styles.responseText}>
          {sending ? "Sending..." : ble?.ppResponse || "No response yet."}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  comToggleButton: {
    flex: 1,
    backgroundColor: "#eee",
    borderRadius: 16,
    paddingVertical: 10,
    marginHorizontal: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bbb",
  },
  comToggleButtonActive: {
    backgroundColor: "#ff0000",
    borderColor: "#000000",
  },
  comToggleButtonText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 16,
  },
  comToggleButtonTextActive: {
    color: "#fff",
  },
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
  categoryScroll: {
    marginBottom: 16,
    maxHeight: 48,
  },
  categoryScrollContent: {
    alignItems: "center",
    paddingHorizontal: 4,
  },
  categoryButton: {
    backgroundColor: "#eee",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  categoryButtonActive: {
    backgroundColor: "#ff0000",
    borderColor: "#000000",
  },
  categoryButtonText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 15,
  },
  categoryButtonTextActive: {
    color: "#fff",
  },
  comToggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
    gap: 12,
  },
  baudrateButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    marginHorizontal: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  baudrateButtonText: {
    color: "#000000",
    fontWeight: "600",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: 280,
    alignItems: "center",
    elevation: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 18,
    color: "#333",
  },
  modalButton: {
    backgroundColor: "#ff0000",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginVertical: 6,
    alignItems: "center",
    width: "100%",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
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
