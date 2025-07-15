import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    FlatList,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useBLEContext } from "../contexts/BLEContext";

export default function MenuScreen() {
  const {
    bleService,
    isConnected,
    bleManager,
    sendBMCommand,
    commandResponse,
  } = useBLEContext();
  const router = useRouter();
  const [responses, setResponses] = useState<
    Array<{ command: string; response: string; timestamp: Date }>
  >([]);

  // Command categories/types
  const commandCategories = [
    { key: "userSNI", label: "User SNI" },
    { key: "scale", label: "Scale" },
    { key: "relays", label: "Relays" },
    { key: "wifi", label: "Wi-fi" },
    { key: "sni", label: "SNI" },
    { key: "mqtt", label: "MQTT" },
    { key: "updates", label: "Updates" },
  ];
  const [selectedCategory, setSelectedCategory] = useState<string>(
    commandCategories[0].key
  );

  // Commands for each category
  const commandsByCategory: Record<
    string,
    Array<{
      title: string;
      command: string;
      params?: Array<{ key: string; label: string }>;
    }>
  > = {
    userSNI: [
      { title: "Get Module Info", command: "get_module_info" },
      {
        title: "Module Password",
        command: "module_password",
        params: [
          { key: "password", label: "Password" },
          { key: "auth", label: "Auth Key" },
        ],
      },
      {
        title: "Get Module Password Number Reset",
        command: "get_module_password_number_reset",
      },
      {
        title: "Set Module Password Number Reset",
        command: "set_module_password_number_reset",
      },
      {
        title: "Factory Default",
        command: "factory_default",
        params: [{ key: "auth", label: "Auth Key" }],
      },
    ],
    scale: [
      { title: "Get Weight", command: "get_weight" },
      {
        title: "Set AP",
        command: "set_ap",
        params: [
          { key: "ssid", label: "SSID" },
          { key: "hidden", label: "Hidden" },
          { key: "auth", label: "Auth Key" },
        ],
      },
      { title: "Get Parts Count", command: "get_parts_count" },
      { title: "Get XPrinter", command: "get_xprinter" },
      {
        title: "Set XPrinter",
        command: "set_xprinter",
        params: [
          { key: "enable", label: "Enable" },
          { key: "ip", label: "IP Address" },
        ],
      },
      { title: "Get Repeater IP Conn", command: "get_repeater_ip_conn" },
      {
        title: "Set Repeater IP Conn",
        command: "set_repeater_ip_conn",
        params: [{ key: "ip", label: "IP Address" }],
      },
      {
        title: "Send Key",
        command: "send_key",
        params: [{ key: "key", label: "Key" }],
      },
    ],
    relays: [
      {
        title: "Turn On Relay",
        command: "turn_on_relay",
        params: [
          { key: "auth", label: "Auth Key" },
          { key: "num", label: "Relay Number" },
        ],
      },
      {
        title: "Turn Off Relay",
        command: "turn_off_relay",
        params: [
          { key: "auth", label: "Auth Key" },
          { key: "num", label: "Relay Number" },
        ],
      },
      {
        title: "Turn On Relay Timed",
        command: "turn_on_relay_timed",
        params: [
          { key: "auth", label: "Auth Key" },
          { key: "num", label: "Relay Number" },
          { key: "time", label: "Duration (seconds)" },
        ],
      },
      {
        title: "Turn On All Relay",
        command: "turn_on_all_relay",
        params: [{ key: "auth", label: "Auth Key" }],
      },
      {
        title: "Turn Off All Relay",
        command: "turn_off_all_relay",
        params: [{ key: "auth", label: "Auth Key" }],
      },
      {
        title: "Define Relays State",
        command: "define_relays_state",
        params: [
          { key: "auth", label: "Auth Key" },
          { key: "state", label: "Relay State" },
        ],
      },
      { title: "Get IO State", command: "get_io_states" },
    ],
    wifi: [
      {
        title: "Wifi Connect",
        command: "wifi_connect",
        params: [
          { key: "ssid", label: "SSID" },
          { key: "password", label: "Password" },
          { key: "auth", label: "Auth Key" },
        ],
      },
      { title: "Wifi Scan", command: "wifi_scan" },
      {
        title: "Wifi Disconnect",
        command: "wifi_disconnect",
        params: [{ key: "auth", label: "Auth Key" }],
      },
      {
        title: "Wifi IP Data",
        command: "wifi_ip_data",
        params: [
          { key: "dhcp", label: "DHCP" },
          { key: "auth", label: "Auth Key" },
        ],
      },
      {
        title: "Ethernet IP Data",
        command: "eth_ip_data",
        params: [
          { key: "dhcp", label: "DHCP" },
          { key: "auth", label: "Auth Key" },
        ],
      },
    ],
    sni: [
      { title: "Get Serials Config", command: "get_serials_config" },
      {
        title: "Set Serials Config",
        command: "set_serials_config",
        params: [
          { key: "auth", label: "Auth Key" },
          { key: "serial", label: "Serial" },
          { key: "interface", label: "Interface" },
          { key: "protocol", label: "Protocol" },
          { key: "baudrate", label: "Baudrate" },
          { key: "databits", label: "Data Bits" },
          { key: "parity", label: "Parity" },
          { key: "stopbits", label: "Stop Bits" },
          { key: "hw_flow_ctrl", label: "HW Flow Control" },
        ],
      },
      {
        title: "Set Device Serial Number",
        command: "set_device_serial_number",
        params: [
          { key: "auth", label: "Auth Key" },
          { key: "sn", label: "Serial Number" },
        ],
      },
      {
        title: "Set Device Type",
        command: "set_device_type",
        params: [
          { key: "auth", label: "Auth Key" },
          { key: "type", label: "Device Type" },
        ],
      },
    ],
    mqtt: [
      { title: "Get MQTT", command: "get_mqtt" },
      {
        title: "Set MQTT",
        command: "set_mqtt",
        params: [
          { key: "state", label: "State" },
          { key: "password", label: "Password" },
          { key: "auth", label: "Auth Key" },
        ],
      },
      {
        title: "ID Set MQTT",
        command: "id_set_mqtt",
        params: [
          { key: "host", label: "Host" },
          { key: "state", label: "State" },
          { key: "password", label: "Password" },
          { key: "auth", label: "Auth Key" },
        ],
      },
    ],
    updates: [
      { title: "Firmware Update", command: "firmware_update" },
      { title: "Development OTA Update", command: "development_ota_update" },
    ],
  };

  // Watch for command responses from the BLE context
  useEffect(() => {
    if (commandResponse) {
      setResponses((prev) => [
        {
          command: commandResponse.command,
          response: commandResponse.response,
          timestamp: commandResponse.timestamp,
        },
        ...prev.slice(0, 9), // Keep last 10 responses
      ]);
    }
  }, [commandResponse]);

  // Modal state for parameterized commands
  const [modalVisible, setModalVisible] = useState(false);
  const [modalParams, setModalParams] = useState<
    { key: string; label: string; value: string }[]
  >([]);
  const [modalCommand, setModalCommand] = useState<string>("");

  // Open modal for parameter input
  const openParamModal = (
    command: string,
    params: Array<{ key: string; label: string }>
  ) => {
    setModalCommand(command);
    setModalParams(params.map((p) => ({ ...p, value: "" })));
    setModalVisible(true);
  };

  // Handle sending command (with or without params)
  const handleCommand = async (
    command: string,
    params?: Array<{ key: string; value: string }>
  ) => {
    let fullCommand = `bm_ble/${command}`;
    // Special handling for wifi_connect
    if (command === "wifi_connect" && params && params.length > 0) {
      // Find values
      const ssid = params.find(p => p.key === "ssid")?.value || "";
      const password = params.find(p => p.key === "password")?.value || "";
      const auth = params.find(p => p.key === "auth")?.value || "";
      // Base64 encode auth
      let passbase64 = "";
      try {
        passbase64 = typeof btoa !== 'undefined' ? btoa(auth) : Buffer.from(auth, 'utf-8').toString('base64');
      } catch (e) {
        passbase64 = "";
      }
      // Build raw string
      const rawString = `ssid=${ssid}&password=${password}&auth=${passbase64}`;
      // Base64 encode the whole string
      let encoded = "";
      try {
        encoded = typeof btoa !== 'undefined' ? btoa(rawString) : Buffer.from(rawString, 'utf-8').toString('base64');
      } catch (e) {
        encoded = "";
      }
      fullCommand = `bm_ble/wifi_connect?${encoded}`;
    } else if (params && params.length > 0) {
      const paramString = params
        .map((p) => `${p.key}=${encodeURIComponent(p.value)}`)
        .join("&");
      fullCommand += `?${paramString}`;
    }
    try {
      setResponses((prev) => [
        {
          command: fullCommand,
          response: "Sending...",
          timestamp: new Date(),
        },
        ...prev,
      ]);
      await sendBMCommand(fullCommand);
      console.log(`Command sent: ${fullCommand}`);
    } catch (error) {
      console.error(`Failed to send command: ${fullCommand}`, error);
      setResponses((prev) => [
        {
          command: fullCommand,
          response: `Error: ${error}`,
          timestamp: new Date(),
        },
        ...prev,
      ]);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <Text style={styles.title}>Commands</Text>

      {/* Command category selector */}
      <ScrollView
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {commandCategories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryButton,
              selectedCategory === cat.key && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                selectedCategory === cat.key && styles.categoryButtonTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Commands for selected category */}
      <View style={styles.commandsContainer}>
        {commandsByCategory[selectedCategory].length === 0 ? (
          <Text style={styles.emptyResponseText}>
            No commands for this category yet.
          </Text>
        ) : (
          commandsByCategory[selectedCategory].map((btn, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.commandButton,
                !isConnected && styles.disabledButton,
              ]}
              onPress={() => {
                if (btn.params && btn.params.length > 0) {
                  openParamModal(btn.command, btn.params);
                } else {
                  handleCommand(btn.command);
                }
              }}
              disabled={!isConnected}
            >
              <Text style={styles.buttonText}>{btn.title}</Text>
              <Text style={styles.commandText}>{`bm_ble/${btn.command}`}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Modal for parameter input */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Parameters</Text>
            {modalParams.map((param, idx) => (
              <View key={param.key} style={styles.inputRow}>
                <Text style={styles.inputLabel}>{param.label}</Text>
                <TextInput
                  style={styles.inputBox}
                  value={param.value}
                  onChangeText={(text) => {
                    setModalParams((prev) =>
                      prev.map((p, i) =>
                        i === idx ? { ...p, value: text } : p
                      )
                    );
                  }}
                  placeholder={param.label}
                  autoCapitalize="none"
                />
              </View>
            ))}
            <View style={styles.modalButtonRow}>
              <Pressable
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalSend]}
                onPress={() => {
                  handleCommand(
                    modalCommand,
                    modalParams.map(({ key, value }) => ({ key, value }))
                  );
                  setModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>Send</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Response section */}
      <View style={styles.responseSection}>
        <Text style={styles.responseSectionTitle}>
          Command Responses {isConnected ? "(Connected)" : "(Disconnected)"}
        </Text>
        {responses.length === 0 ? (
          <View style={styles.emptyResponseContainer}>
            <Text style={styles.emptyResponseText}>
              No responses yet. Send a command to see results.
            </Text>
          </View>
        ) : (
          <FlatList
            data={responses}
            keyExtractor={(_, idx) => idx.toString()}
            renderItem={({ item }) => (
              <View style={styles.responseItem}>
                <View style={styles.responseHeader}>
                  <Text style={styles.responseCommand}>{item.command}</Text>
                  <Text style={styles.responseTime}>
                    {formatTime(item.timestamp)}
                  </Text>
                </View>
                <Text style={styles.responseText}>{item.response}</Text>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  inputLabel: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  inputBox: {
    flex: 2,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 8,
  },
  modalCancel: {
    backgroundColor: "#323E48",
  },
  modalSend: {
    backgroundColor: "#ff0000",
  },
  modalButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  categoryScroll: {
    marginBottom: 20,
    maxHeight: 48,
    maxWidth: "100%",
  },
  categoryContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    // No marginBottom here, handled by categoryScroll
  },
  categoryButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 4,
  },
  categoryButtonActive: {
    backgroundColor: "#ff0000",
  },
  categoryButtonText: {
    color: "#333",
    fontWeight: "600",
  },
  categoryButtonTextActive: {
    color: "white",
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    color: "#666",
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
  disabledButton: {
    opacity: 0.5,
    backgroundColor: "#eee",
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
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  navButton: {
    backgroundColor: "#5856D6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  navButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  responseSection: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingBottom: 32,
  },
  responseSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333",
  },
  emptyResponseContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyResponseText: {
    color: "#666",
    fontStyle: "italic",
  },
  responseItem: {
    backgroundColor: "#f9f9f9",
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#5856D6",
  },
  responseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  responseCommand: {
    fontWeight: "600",
    color: "#333",
  },
  responseTime: {
    fontSize: 12,
    color: "#666",
  },
  responseText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 14,
  },
});
