import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import CommandModal from "../components/ppcommands/CommandModal";
import HelpModal from "../components/ppcommands/HelpModal";
import ResponseSection from "../components/ppcommands/ResponseSection";
import { CommandAction, COMPort, HelpModalType, SendPPCommandParams } from "../components/ppcommands/types";
import { calculateChecksum, categories, ppCommands } from "../components/ppcommands/utils";
import { useBLEContext } from "../contexts/BLEContext";

export default function PPCommandsScreen() {
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [helpModalType, setHelpModalType] = useState<HelpModalType>("baudrate");
  const [sending, setSending] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("COM");
  const [selectedCOM, setSelectedCOM] = useState<COMPort>("COM 1");
  
  // Modal visibility states
  const [baudModalVisible, setBaudModalVisible] = useState(false);
  const [databitsModalVisible, setDatabitsModalVisible] = useState(false);
  const [parityModalVisible, setParityModalVisible] = useState(false);
  const [stopbitsModalVisible, setStopbitsModalVisible] = useState(false);
  
  const ble = useBLEContext();

  const filteredCommands = selectedCategory === "COM"
    ? []
    : ppCommands.filter((cmd) => cmd.category === selectedCategory);

  // Generic PP command sender
  async function sendPPCommand({
    type,
    com,
    value,
    rawCommand,
  }: SendPPCommandParams) {
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
        const comByte = com === "COM 1" ? 0x01 : 0x02;
        arr = [0xdd, 0xdd, 0x02, 0x02, 0x01, 0x01, 0x00, comByte, value ?? 0];
      } else if (type === "baudrate-read") {
        const comByte = com === "COM 1" ? 0x01 : 0x02;
        arr = [0xdd, 0xdd, 0x02, 0x01, 0x00, 0x01, 0x00, comByte];
      } else if (type === "databits-write") {
        const comByte = com === "COM 1" ? 0x01 : 0x02;
        arr = [0xdd, 0xdd, 0x02, 0x02, 0x01, 0x01, 0x01, comByte, value ?? 0];
      } else if (type === "databits-read") {
        const comByte = com === "COM 1" ? 0x01 : 0x02;
        arr = [0xdd, 0xdd, 0x02, 0x01, 0x00, 0x01, 0x01, comByte];
      } else if (type === "parity-write") {
        const comByte = com === "COM 1" ? 0x01 : 0x02;
        arr = [0xdd, 0xdd, 0x02, 0x02, 0x01, 0x01, 0x02, comByte, value ?? 0];
      } else if (type === "parity-read") {
        const comByte = com === "COM 1" ? 0x01 : 0x02;
        arr = [0xdd, 0xdd, 0x02, 0x01, 0x00, 0x01, 0x02, comByte];
      } else if (type === "stopbits-write") {
        const comByte = com === "COM 1" ? 0x01 : 0x02;
        arr = [0xdd, 0xdd, 0x02, 0x02, 0x01, 0x01, 0x03, comByte, value ?? 0];
      } else if (type === "stopbits-read") {
        const comByte = com === "COM 1" ? 0x01 : 0x02;
        arr = [0xdd, 0xdd, 0x02, 0x01, 0x00, 0x01, 0x03, comByte];
      } else if (type === "raw" && rawCommand) {
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
      
      await ble.sendPPCommand(bytes);
    } catch (e: any) {
      alert(e.message || "Failed to send command");
    } finally {
      setSending(false);
    }
  }

  // Command handlers
  const handleBaudrateCommand = async (action: CommandAction, value?: string) => {
    if (action === "Write" && value) {
      await sendPPCommand({ 
        type: "baudrate-write", 
        com: selectedCOM, 
        value: parseInt(value, 10) 
      });
    } else {
      await sendPPCommand({ 
        type: "baudrate-read", 
        com: selectedCOM 
      });
    }
  };

  const handleDatabitsCommand = async (action: CommandAction, value?: string) => {
    if (action === "Write" && value) {
      await sendPPCommand({ 
        type: "databits-write", 
        com: selectedCOM, 
        value: parseInt(value, 10) 
      });
    } else {
      await sendPPCommand({ 
        type: "databits-read", 
        com: selectedCOM 
      });
    }
  };

  const handleParityCommand = async (action: CommandAction, value?: string) => {
    if (action === "Write" && value) {
      await sendPPCommand({ 
        type: "parity-write", 
        com: selectedCOM, 
        value: parseInt(value, 10) 
      });
    } else {
      await sendPPCommand({ 
        type: "parity-read", 
        com: selectedCOM 
      });
    }
  };

  const handleStopbitsCommand = async (action: CommandAction, value?: string) => {
    if (action === "Write" && value) {
      await sendPPCommand({ 
        type: "stopbits-write", 
        com: selectedCOM, 
        value: parseInt(value, 10) 
      });
    } else {
      await sendPPCommand({ 
        type: "stopbits-read", 
        com: selectedCOM 
      });
    }
  };

  const showHelp = (type: HelpModalType) => {
    setHelpModalType(type);
    setHelpModalVisible(true);
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

      {/* COM section */}
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
              style={styles.commandButton}
              onPress={() => setBaudModalVisible(true)}
            >
              <Text style={styles.commandButtonText}>Write/Read Baudrate</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={styles.commandButton}
              onPress={() => setDatabitsModalVisible(true)}
            >
              <Text style={styles.commandButtonText}>Write/Read Databits</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={styles.commandButton}
              onPress={() => setParityModalVisible(true)}
            >
              <Text style={styles.commandButtonText}>Write/Read Parity</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={styles.commandButton}
              onPress={() => setStopbitsModalVisible(true)}
            >
              <Text style={styles.commandButtonText}>Write/Read Stopbits</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Other categories */}
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
                style={styles.otherCommandButton}
                onPress={() => sendPPCommand({ type: "raw", rawCommand: btn.command })}
              >
                <Text style={styles.buttonText}>{btn.title}</Text>
                <Text style={styles.commandText}>{btn.command}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      <ResponseSection sending={sending} ppResponse={ble?.ppResponse} />

      {/* Bottom spacing for better scrolling */}
      <View style={{ height: 70 }} />

      {/* Modals */}
      <CommandModal
        visible={baudModalVisible}
        onClose={() => setBaudModalVisible(false)}
        onConfirm={handleBaudrateCommand}
        title="Write/Read Baudrate"
        valueRange="0-7"
        validationPattern={/^[0-7]?$/}
        helpModalType="baudrate"
        onShowHelp={showHelp}
      />

      <CommandModal
        visible={databitsModalVisible}
        onClose={() => setDatabitsModalVisible(false)}
        onConfirm={handleDatabitsCommand}
        title="Write/Read Databits"
        valueRange="0-1"
        validationPattern={/^[0-1]?$/}
        helpModalType="databits"
        onShowHelp={showHelp}
      />

      <CommandModal
        visible={parityModalVisible}
        onClose={() => setParityModalVisible(false)}
        onConfirm={handleParityCommand}
        title="Write/Read Parity"
        valueRange="0-2"
        validationPattern={/^[0-2]?$/}
        helpModalType="parity"
        onShowHelp={showHelp}
      />

      <CommandModal
        visible={stopbitsModalVisible}
        onClose={() => setStopbitsModalVisible(false)}
        onConfirm={handleStopbitsCommand}
        title="Write/Read Stopbits"
        valueRange="0-1"
        validationPattern={/^[0-1]?$/}
        helpModalType="stopbits"
        onShowHelp={showHelp}
      />

      <HelpModal
        visible={helpModalVisible}
        onClose={() => setHelpModalVisible(false)}
        type={helpModalType}
      />
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
  commandButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    marginHorizontal: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  commandButtonText: {
    color: "#000000",
    fontWeight: "600",
    fontSize: 16,
  },
  commandsContainer: {
    marginBottom: 20,
  },
  otherCommandButton: {
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
});
