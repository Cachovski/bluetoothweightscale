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
  const [helpModalType, setHelpModalType] = useState<"baudrate" | "databits">("baudrate");
  const [sending, setSending] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("COM");
  const [selectedCOM, setSelectedCOM] = useState<"COM 1" | "COM 2">("COM 1");
  const [baudModalVisible, setBaudModalVisible] = useState(false);
  const [baudAction, setBaudAction] = useState<"Write" | "Read">("Read");
  const [baudValue, setBaudValue] = useState("");
  const [baudError, setBaudError] = useState("");
  const [databitsModalVisible, setDatabitsModalVisible] = useState(false);
  const [databitsAction, setDatabitsAction] = useState<"Write" | "Read">("Read");
  const [databitsValue, setDatabitsValue] = useState("");
  const [databitsError, setDatabitsError] = useState("");
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
    rawCommand,
  }: {
    type: "baudrate-write" | "baudrate-read" | "databits-write" | "databits-read" | "raw";
    com?: "COM 1" | "COM 2";
    value?: number;
    rawCommand?: string;
  }) {
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
      } else if (type === "databits-write") {
        // Write Databits: DDDD0202010200(data)checksum03
        // [0xdd,0xdd,0x02,0x02,0x01,0x01,0x01, comByte, valueByte, checksum, 0x03]
        const comByte = com === "COM 1" ? 0x01 : 0x02;
        arr = [0xdd, 0xdd, 0x02, 0x02, 0x01, 0x01, 0x01, comByte, value ?? 0];
      } else if (type === "databits-read") {
        // Read Databits: DDDD0201000200(data)checksum03
        // [0xdd,0xdd,0x02,0x01,0x00,0x01,0x01, comByte, checksum, 0x03]
        const comByte = com === "COM 1" ? 0x01 : 0x02;
        arr = [0xdd, 0xdd, 0x02, 0x01, 0x00, 0x01, 0x01, comByte];
      } else if (type === "raw" && rawCommand) {
        // For legacy commands, send as string
        await ble.sendTCommand(rawCommand);
        setSending(false);
        return;
      } else {
        alert("Invalid command parameters");
        setSending(false);
        return;
      }

      const checksum = calculateChecksum(arr);
      const bytes = [...arr, checksum, 0x03];
      
      // Use the dedicated PP command function
      await ble.sendPPCommand(bytes);
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
          <View style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={styles.baudrateButton}
              onPress={() => setDatabitsModalVisible(true)}
            >
              <Text style={styles.baudrateButtonText}>Write/Read Databits</Text>
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
                    onPress={() => {
                      setHelpModalType("baudrate");
                      setHelpModalVisible(true);
                    }}
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
      {/* Help modal for baudrate/databits value table */}
      <Modal
        visible={helpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHelpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: 320 }]}> 
            <Text style={styles.modalTitle}>
              {helpModalType === "baudrate" ? "Baudrate Value Table" : "Databits Value Table"}
            </Text>
            <View style={{ width: "100%", marginBottom: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ fontWeight: "bold", color: "#333" }}>Value</Text>
                <Text style={{ fontWeight: "bold", color: "#333" }}>
                  {helpModalType === "baudrate" ? "Baudrate" : "Meaning"}
                </Text>
              </View>
              <View style={{ borderBottomWidth: 1, borderColor: "#eee", marginBottom: 6 }} />
              {helpModalType === "baudrate" ? [
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
              )) : [
                { value: "0x00", meaning: "8 Bits" },
                { value: "0x01", meaning: "9 Bits" },
              ].map((row, idx) => (
                <View key={row.value} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                  <Text style={{ color: "#333" }}>{row.value}</Text>
                  <Text style={{ color: "#333" }}>{row.meaning}</Text>
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
                  try {
                    if (baudAction === "Write") {
                      if (!baudValue.match(/^[0-7]$/)) {
                        setBaudError("Enter a value 0-7");
                        return;
                      }
                      await sendPPCommand({ 
                        type: "baudrate-write", 
                        com: selectedCOM, 
                        value: parseInt(baudValue, 10) 
                      });
                    } else {
                      await sendPPCommand({ 
                        type: "baudrate-read", 
                        com: selectedCOM 
                      });
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

      {/* Modal for Write/Read Databits choice with toggles and input */}
      <Modal
        visible={databitsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDatabitsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Write/Read Databits</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleButton, databitsAction === "Read" && styles.toggleButtonActive]}
                onPress={() => {
                  setDatabitsAction("Read");
                  setDatabitsError("");
                }}
              >
                <Text style={[styles.toggleButtonText, databitsAction === "Read" && styles.toggleButtonTextActive]}>Read</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, databitsAction === "Write" && styles.toggleButtonActive]}
                onPress={() => {
                  setDatabitsAction("Write");
                  setDatabitsError("");
                }}
              >
                <Text style={[styles.toggleButtonText, databitsAction === "Write" && styles.toggleButtonTextActive]}>Write</Text>
              </TouchableOpacity>
            </View>
            {databitsAction === "Write" && (
              <View style={{ width: "100%", marginTop: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <Text style={{ fontSize: 15, color: "#333" }}>Databits Value (0-1):</Text>
                  <TouchableOpacity
                    style={styles.helpButton}
                    onPress={() => {
                      setHelpModalType("databits");
                      setHelpModalVisible(true);
                    }}
                    accessibilityLabel="Show databits value table"
                  >
                    <Ionicons name="help-circle-outline" size={22} color="#888" />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    maxLength={1}
                    value={databitsValue}
                    onChangeText={(text: string) => {
                      // Only allow 0-1
                      if (/^[0-1]?$/.test(text)) {
                        setDatabitsValue(text);
                        setDatabitsError("");
                      }
                    }}
                    placeholder="0-1"
                  />
                </View>
                {databitsError ? <Text style={styles.errorText}>{databitsError}</Text> : null}
              </View>
            )}
            <View style={{ flexDirection: "row", marginTop: 24, width: "100%", justifyContent: "space-between" }}>
              <TouchableOpacity
                style={[styles.modalButton, { flex: 1, marginRight: 8 }]}
                onPress={async () => {
                  if (!ble || !ble.bleService) {
                    setDatabitsError("Not connected");
                    return;
                  }
                  try {
                    if (databitsAction === "Write") {
                      if (!databitsValue.match(/^[0-1]$/)) {
                        setDatabitsError("Enter a value 0-1");
                        return;
                      }
                      await sendPPCommand({ 
                        type: "databits-write", 
                        com: selectedCOM, 
                        value: parseInt(databitsValue, 10) 
                      });
                    } else {
                      await sendPPCommand({ 
                        type: "databits-read", 
                        com: selectedCOM 
                      });
                    }
                    setDatabitsModalVisible(false);
                    setDatabitsValue("");
                    setDatabitsError("");
                  } catch (e) {
                    setDatabitsError((e as any).message || "Failed to send");
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { flex: 1, marginLeft: 8, backgroundColor: "#eee" }]}
                onPress={() => {
                  setDatabitsModalVisible(false);
                  setDatabitsValue("");
                  setDatabitsError("");
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
                onPress={() => sendPPCommand({ type: "raw", rawCommand: btn.command })}
              >
                <Text style={styles.buttonText}>{btn.title}</Text>
                <Text style={styles.commandText}>{btn.command}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
      <View style={styles.responseSection}>
        <Text style={styles.responseTitle}>PP Command Response</Text>
        {sending ? (
          <Text style={styles.responseText}>⏳ Sending command...</Text>
        ) : ble?.ppResponse ? (
          <View style={styles.responseDetails}>
            {/* Parse and display the response in detail */}
            {(() => {
              const responseStr = ble.ppResponse;
              if (responseStr.startsWith("Response: ")) {
                const hexResponse = responseStr.replace("Response: ", "");
                
                // Convert hex string back to bytes for analysis
                const bytes: number[] = [];
                for (let i = 0; i < hexResponse.length; i += 2) {
                  bytes.push(parseInt(hexResponse.substr(i, 2), 16));
                }
                
                return (
                  <View>
                    <Text style={styles.responseLabel}>📩 Raw Response Data:</Text>
                    <Text style={styles.responseValue}>- Length: {bytes.length} bytes</Text>
                    <Text style={styles.responseValue}>- Hex: {hexResponse}</Text>
                    <Text style={styles.responseValue}>- Bytes: [{bytes.join(', ')}]</Text>
                    
                    {bytes.length > 0 && (
                      <>
                        <Text style={styles.responseLabel}>📩 Response Analysis:</Text>
                        <Text style={styles.responseValue}>- First byte: 0x{bytes[0].toString(16).padStart(2, '0').toUpperCase()} ({bytes[0]})</Text>
                        {bytes.length > 1 && (
                          <Text style={styles.responseValue}>- Last byte: 0x{bytes[bytes.length - 1].toString(16).padStart(2, '0').toUpperCase()} ({bytes[bytes.length - 1]})</Text>
                        )}
                        
                        <Text style={styles.responseLabel}>📩 ASCII Interpretation:</Text>
                        <Text style={styles.responseValue}>
                          {bytes.map((byte, index) => {
                            if (byte >= 32 && byte <= 126) {
                              return String.fromCharCode(byte);
                            } else {
                              return `[${byte}]`;
                            }
                          }).join('')}
                        </Text>
                        
                        <Text style={styles.responseLabel}>📩 Response Type:</Text>
                        {bytes[0] === 0xDD && bytes.length > 1 && bytes[1] === 0xDD ? (
                          <Text style={styles.responseSuccess}>✅ Valid PP Response (starts with DDDD)</Text>
                        ) : bytes[0] === 0x06 ? (
                          <Text style={styles.responseSuccess}>✅ ACK Response (0x06)</Text>
                        ) : bytes[0] === 0x15 ? (
                          <Text style={styles.responseError}>❌ NAK Response (0x15)</Text>
                        ) : (
                          <Text style={styles.responseWarning}>⚠️ Unknown Response Pattern</Text>
                        )}
                      </>
                    )}
                  </View>
                );
              } else {
                return <Text style={styles.responseText}>{responseStr}</Text>;
              }
            })()}
          </View>
        ) : (
          <Text style={styles.responseText}>🔍 No response yet. Send a command to see detailed response analysis.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
    gap: 12,
    width: "100%",
  },
  toggleButton: {
    flex: 1,
    backgroundColor: "#eee",
    borderRadius: 8,
    paddingVertical: 10,
    marginHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bbb",
  },
  toggleButtonActive: {
    backgroundColor: "#ff0000",
    borderColor: "#000000",
  },
  toggleButtonText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 16,
  },
  toggleButtonTextActive: {
    color: "#fff",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
    backgroundColor: "#fafafa",
    color: "#333",
    textAlign: "center",
  },
  helpButton: {
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
  responseTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  responseDetails: {
    marginTop: 8,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 8,
    marginBottom: 4,
  },
  responseValue: {
    fontSize: 13,
    color: "#555",
    marginLeft: 8,
    marginBottom: 2,
    fontFamily: "monospace",
  },
  responseSuccess: {
    fontSize: 13,
    color: "#28a745",
    marginLeft: 8,
    fontWeight: "600",
  },
  responseError: {
    fontSize: 13,
    color: "#dc3545",
    marginLeft: 8,
    fontWeight: "600",
  },
  responseWarning: {
    fontSize: 13,
    color: "#ffc107",
    marginLeft: 8,
    fontWeight: "600",
  },
  responseText: {
    fontSize: 14,
    color: "#333",
  },
});
