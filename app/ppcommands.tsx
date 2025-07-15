import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useBLEContext } from "../contexts/BLEContext";

export default function PPCommandsScreen() {
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("COM");
  const [selectedCOM, setSelectedCOM] = useState<"COM 1" | "COM 2">("COM 1");
  const [baudModalVisible, setBaudModalVisible] = useState(false);
  const [baudAction, setBaudAction] = useState<"Write" | "Read">("Read");
  const [baudValue, setBaudValue] = useState("");
  const [baudError, setBaudError] = useState("");
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


  // Generic PP command sender
  async function sendPPCommand({
    type,
    com,
    value,
    raw,
  }: {
    type: "baudrate-write" | "baudrate-read" | "com" | "raw";
    com?: "COM 1" | "COM 2";
    value?: number;
    raw?: string;
  }) {
    if (!ble || !ble.bleService) {
      alert("Not connected to a device");
      return;
    }
    setSending(true);
    try {
      // Find DD08 characteristic (not used directly, but for logic clarity)
      const dd08 = ble.bleService?.characteristics.find(
        (c) =>
          c.uuid.toLowerCase() ===
            ble.bleService?.characteristics[0]?.uuid
              .toLowerCase()
              .replace(/dd0[1-5]/, "dd08") ||
          c.uuid.toLowerCase() === "0000dd08-0000-1000-8000-00805f9b34fb"
      );
      if (!dd08) throw new Error("DD08 characteristic not found");

      let arr: number[] = [];
      if (type === "baudrate-write") {
        // Write: DDDD0202010100(data)checksum03
        // [0xdd,0xdd,0x02,0x02,0x01,0x01,0x00, comByte, valueByte, checksum, 0x03]
        const comByte = com === "COM 1" ? 0x01 : 0x02;
        arr = [0xdd, 0xdd, 0x02, 0x02, 0x01, 0x01, 0x00, comByte, value ?? 0];
      } else if (type === "baudrate-read") {
        // Read: DDDD0201000100(data)checksum03
        // [0xdd,0xdd,0x02,0x01,0x00,0x01,0x00, comByte, checksum, 0x03]
        const comByte = com === "COM 1" ? 0x01 : 0x02;
        arr = [0xdd, 0xdd, 0x02, 0x01, 0x00, 0x01, 0x00, comByte];
      } else if (type === "com") {
        // COM command (for future use)
        const comByte = com === "COM 1" ? 0x01 : 0x02;
        arr = [0xdd, 0xdd, 0x02, 0x02, 0x01, 0x01, 0x00, comByte];
      } else if (type === "raw" && typeof raw === "string") {
        await ble.sendTCommand(raw);
        setSending(false);
        return;
      } else {
        alert("Unknown command type");
        setSending(false);
        return;
      }
      const checksum = calculateChecksum(arr);
      const bytes = [...arr, checksum, 0x03];
      const str = String.fromCharCode(...bytes);
      await ble.sendTCommand(str);
    } catch (e: any) {
      alert(e.message || "Failed to send command");
    } finally {
      setSending(false);
    }
  }

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

      {/* Modal for Write/Read Baudrate choice with toggles and input */}
      <Modal
        visible={baudModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBaudModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Write/Read Baudrate</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleButton, baudAction === "Read" && styles.toggleButtonActive]}
                onPress={() => {
                  setBaudAction("Read");
                  setBaudError("");
                }}
              >
                <Text style={[styles.toggleButtonText, baudAction === "Read" && styles.toggleButtonTextActive]}>Read</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, baudAction === "Write" && styles.toggleButtonActive]}
                onPress={() => {
                  setBaudAction("Write");
                  setBaudError("");
                }}
              >
                <Text style={[styles.toggleButtonText, baudAction === "Write" && styles.toggleButtonTextActive]}>Write</Text>
              </TouchableOpacity>
            </View>
            {baudAction === "Write" && (
              <View style={{ width: "100%", marginTop: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <Text style={{ fontSize: 15, color: "#333" }}>Baudrate Value (0-7):</Text>
                  <TouchableOpacity
                    style={styles.helpButton}
                    onPress={() => setHelpModalVisible(true)}
                    accessibilityLabel="Show baudrate value table"
                  >
                    <Ionicons name="help-circle-outline" size={22} color="#888" />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    maxLength={1}
                    value={baudValue}
                    onChangeText={(text: string) => {
                      // Only allow 0-7
                      if (/^[0-7]?$/.test(text)) {
                        setBaudValue(text);
                        setBaudError("");
                      }
                    }}
                    placeholder="0-7"
                  />
                </View>
                {baudError ? <Text style={styles.errorText}>{baudError}</Text> : null}
              </View>
            )}
      {/* Help modal for baudrate value table */}
      <Modal
        visible={helpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHelpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: 320 }]}> 
            <Text style={styles.modalTitle}>Baudrate Value Table</Text>
            <View style={{ width: "100%", marginBottom: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ fontWeight: "bold", color: "#333" }}>Value</Text>
                <Text style={{ fontWeight: "bold", color: "#333" }}>Baudrate</Text>
              </View>
              <View style={{ borderBottomWidth: 1, borderColor: "#eee", marginBottom: 6 }} />
              {[
                { value: "0x00", baud: "1200" },
                { value: "0x01", baud: "2400" },
                { value: "0x02", baud: "4800" },
                { value: "0x03", baud: "9600" },
                { value: "0x04", baud: "19200" },
                { value: "0x05", baud: "38400" },
                { value: "0x06", baud: "57600" },
                { value: "0x07", baud: "115200" },
              ].map((row, idx) => (
                <View key={row.value} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                  <Text style={{ color: "#333" }}>{row.value}</Text>
                  <Text style={{ color: "#333" }}>{row.baud}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#eee" }]}
              onPress={() => setHelpModalVisible(false)}
            >
              <Text style={[styles.modalButtonText, { color: "#333" }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
            <View style={{ flexDirection: "row", marginTop: 24, width: "100%", justifyContent: "space-between" }}>
              <TouchableOpacity
                style={[styles.modalButton, { flex: 1, marginRight: 8 }]}
                onPress={async () => {
                  if (!ble || !ble.bleService) {
                    setBaudError("Not connected");
                    return;
                  }
                  setSending(true);
                  try {
                    // Find DD08 characteristic (not used directly, but for logic clarity)
                    const dd08 = ble.bleService?.characteristics.find(
                      (c) =>
                        c.uuid.toLowerCase() ===
                          ble.bleService?.characteristics[0]?.uuid
                            .toLowerCase()
                            .replace(/dd0[1-5]/, "dd08") ||
                        c.uuid.toLowerCase() === "0000dd08-0000-1000-8000-00805f9b34fb"
                    );
                    if (!dd08) throw new Error("DD08 characteristic not found");

                    // COM port byte
                    const comByte = selectedCOM === "COM 1" ? 0x01 : 0x02;

                    let arr;
                    if (baudAction === "Write") {
                      if (!baudValue.match(/^[0-7]$/)) {
                        setBaudError("Enter a value 0-7");
                        setSending(false);
                        return;
                      }
                      // Write: DDDD0202010100(data)checksum03
                      // [0xdd,0xdd,0x02,0x02,0x01,0x01,0x00, comByte, valueByte, checksum, 0x03]
                      const valueByte = parseInt(baudValue, 10);
                      arr = [0xdd, 0xdd, 0x02, 0x02, 0x01, 0x01, 0x00, comByte, valueByte];
                    } else {
                      // Read: DDDD0201000100(data)checksum03
                      // [0xdd,0xdd,0x02,0x01,0x00,0x01,0x00, comByte, checksum, 0x03]
                      arr = [0xdd, 0xdd, 0x02, 0x01, 0x00, 0x01, 0x00, comByte];
                    }
                    const checksum = calculateChecksum(arr);
                    const bytes = [...arr, checksum, 0x03];
                    const str = String.fromCharCode(...bytes);
                    await ble.sendTCommand(str);
                    setBaudModalVisible(false);
                    setBaudValue("");
                    setBaudError("");
                  } catch (e) {
                    setBaudError((e as any).message || "Failed to send");
                  } finally {
                    setSending(false);
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { flex: 1, marginLeft: 8, backgroundColor: "#eee" }]}
                onPress={() => {
                  setBaudModalVisible(false);
                  setBaudValue("");
                  setBaudError("");
                }}
              >
                <Text style={[styles.modalButtonText, { color: "#333" }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", marginTop: 24, width: "100%", justifyContent: "space-between" }}>
              <TouchableOpacity
                style={[styles.modalButton, { flex: 1, marginRight: 8 }]}
                onPress={async () => {
                  if (!ble || !ble.bleService) {
                    setBaudError("Not connected");
                    return;
                  }
                  try {
                    if (baudAction === "Write") {
                      if (!baudValue.match(/^[0-7]$/)) {
                        setBaudError("Enter a value 0-7");
                        setSending(false);
                        return;
                      }
                      await sendPPCommand({ type: "baudrate-write", com: selectedCOM, value: parseInt(baudValue, 10) });
                    } else {
                      await sendPPCommand({ type: "baudrate-read", com: selectedCOM });
                    }
                    setBaudModalVisible(false);
                    setBaudValue("");
                    setBaudError("");
                  } catch (e) {
                    setBaudError((e as any).message || "Failed to send");
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { flex: 1, marginLeft: 8, backgroundColor: "#eee" }]}
                onPress={() => {
                  setBaudModalVisible(false);
                  setBaudValue("");
                  setBaudError("");
                }}
              >
                <Text style={[styles.modalButtonText, { color: "#333" }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
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
                onPress={() => sendPPCommand({ type: "raw", raw: btn.command })}
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
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
                  if (baudAction === "Write") {
                    if (!baudValue.match(/^[0-7]$/)) {
                      setBaudError("Enter a value 0-7");
                      setSending(false);
                      return;
                    }
                    await sendPPCommand({ type: "baudrate-write", com: selectedCOM, value: parseInt(baudValue, 10) });
                  } else {
                    await sendPPCommand({ type: "baudrate-read", com: selectedCOM });
                  }
                  setBaudModalVisible(false);
                  setBaudValue("");
                  setBaudError("");
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
    height: 40,
    width: 40,
  },
  errorText: {
    color: "#ff3333",
    fontSize: 13,
    marginTop: 2,
    textAlign: "center",
  },
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
