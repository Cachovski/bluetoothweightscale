import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useBLEContext } from "../contexts/BLEContext";

interface WiFiNetwork {
  ssid: string;
  rssi: number;
  authmode: string; // Changed from number to string
}

interface ModuleInfo {
  sta?: {
    ssid: string;
    ip: string;
    state: string;
    dhcp?: string;
    netmask?: string;
    gateway?: string;
    mac?: string;
  };
  ap?: {
    ssid: string;
    ip: string;
    ssid_hidden?: string;
    netmask?: string;
  };
  about?: {
    sni_hw_version: string;
    sni_fw_version: string;
    sni_serial_number_: string;
    device_serial_number: string;
    module_name: string;
    device_type: string;
  };
  [key: string]: any; // For other module info fields
}

const getAuthModeText = (authmode: string): string => {
  // Since authmode is already a string, just return it
  return authmode;
};

const getSignalStrength = (rssi: number): string => {
  if (rssi >= -50) return "Excellent";
  if (rssi >= -60) return "Good";
  if (rssi >= -70) return "Fair";
  if (rssi >= -80) return "Weak";
  return "Very Weak";
};

const getSignalColor = (rssi: number): string => {
  if (rssi >= -50) return "#4CAF50"; // Green
  if (rssi >= -60) return "#8BC34A"; // Light Green
  if (rssi >= -70) return "#FFC107"; // Amber
  if (rssi >= -80) return "#FF9800"; // Orange
  return "#F44336"; // Red
};

export default function WiFiSetupScreen() {
  const [networks, setNetworks] = useState<WiFiNetwork[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);
  const [isLoadingModuleInfo, setIsLoadingModuleInfo] = useState(false);
  const ble = useBLEContext();

  // Parse module info response
  const parseModuleInfoResponse = (response: string): ModuleInfo | null => {
    try {
      console.log("📡 Raw module info response:", response);
      const parsed = JSON.parse(response);
      console.log("📡 Parsed module info:", parsed);
      return parsed;
    } catch (error) {
      console.error("❌ Error parsing module info response:", error);
      return null;
    }
  };

  // Get module info
  const getModuleInfo = async () => {
    if (!ble?.isConnected || !ble?.bleService) {
      return;
    }

    setIsLoadingModuleInfo(true);
    try {
      console.log("📡 Getting module info...");
      await ble.sendBMCommand("bm_ble/get_module_info");
    } catch (error: any) {
      console.error("❌ Module info error:", error);
    }
  };

  // Parse WiFi scan response
  const parseWiFiResponse = (response: string): WiFiNetwork[] => {
    try {
      console.log("📡 Raw WiFi response:", response);
      
      // Try to parse as JSON object with wifi_scaned_devices first (DD01 format)
      try {
        const parsed = JSON.parse(response);
        if (parsed.wifi_scaned_devices && Array.isArray(parsed.wifi_scaned_devices)) {
          console.log("📡 Found wifi_scaned_devices array:", parsed.wifi_scaned_devices);
          
          // Map to our WiFiNetwork interface
          const networks: WiFiNetwork[] = parsed.wifi_scaned_devices.map((network: any) => ({
            ssid: network.ssid || "Unknown",
            rssi: parseInt(network.rssi) || 0,
            authmode: network.authmode || "Unknown",
          }));
          
          // Sort by signal strength (higher RSSI = stronger signal)
          networks.sort((a, b) => b.rssi - a.rssi);
          
          console.log("📡 Processed networks from wifi_scaned_devices:", networks);
          return networks;
        }
      } catch (e) {
        console.log("📡 Not a JSON object, trying array format...");
      }
      
      // Fallback: try to parse as direct array format (T message format)
      // Remove "Response: " prefix if present
      const cleanResponse = response.replace(/^Response:\s*/, "").trim();
      
      // Find the start of the JSON array (after '[')
      const startIndex = cleanResponse.indexOf('[');
      if (startIndex === -1) {
        console.log("❌ No '[' found in response");
        return [];
      }
      
      // Extract the JSON part
      const jsonPart = cleanResponse.substring(startIndex);
      console.log("📡 JSON part:", jsonPart);
      
      // Parse the JSON array
      const parsed = JSON.parse(jsonPart);
      console.log("📡 Parsed networks:", parsed);
      
      if (!Array.isArray(parsed)) {
        console.log("❌ Parsed result is not an array");
        return [];
      }
      
      // Map to our WiFiNetwork interface
      const networks: WiFiNetwork[] = parsed.map((network: any) => ({
        ssid: network.ssid || "Unknown",
        rssi: parseInt(network.rssi) || 0,
        authmode: typeof network.authmode === 'string' ? network.authmode : String(network.authmode),
      }));
      
      // Sort by signal strength (higher RSSI = stronger signal)
      networks.sort((a, b) => b.rssi - a.rssi);
      
      console.log("📡 Processed networks from array:", networks);
      return networks;
    } catch (error) {
      console.error("❌ Error parsing WiFi response:", error);
      return [];
    }
  };

  // Start WiFi scan
  const startWiFiScan = async () => {
    if (!ble?.isConnected || !ble?.bleService) {
      Alert.alert("Error", "Not connected to device");
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setNetworks([]);

    try {
      console.log("📡 Starting WiFi scan...");
      
      // Send the WiFi scan command using BM command (HTTP command)
      await ble.sendBMCommand("bm_ble/wifi_scan");
      
      // Set a timeout to stop scanning after 30 seconds
      setTimeout(() => {
        setIsScanning(false);
        if (networks.length === 0) {
          setScanError("Scan timeout - no response received");
        }
      }, 30000);

    } catch (error: any) {
      console.error("❌ WiFi scan error:", error);
      setIsScanning(false);
      setScanError(error.message || "Failed to start WiFi scan");
    }
  };

  // Connect to WiFi network
  const connectToNetwork = (network: WiFiNetwork) => {
    Alert.alert(
      "Connect to WiFi",
      `Do you want to connect to "${network.ssid}"?\n\nSignal: ${getSignalStrength(network.rssi)} (${network.rssi} dBm)\nSecurity: ${getAuthModeText(network.authmode)}`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Connect", 
          onPress: () => {
            // TODO: Implement WiFi connection logic
            Alert.alert("Coming Soon", "WiFi connection will be implemented in the next update.");
          }
        },
      ]
    );
  };

  // Auto-load module info and WiFi scan when screen loads
  useEffect(() => {
    if (ble?.isConnected && ble?.bleService) {
      // Only get module info if we don't have it yet
      if (!moduleInfo && !isLoadingModuleInfo) {
        getModuleInfo();
      }
      startWiFiScan();
    }
  }, [ble?.isConnected, ble?.bleService]);

  // Listen for any existing command responses that might contain module info
  useEffect(() => {
    if (ble?.commandResponse && !moduleInfo && !isLoadingModuleInfo) {
      // Check if there's already a module info response available
      if (ble.commandResponse.response.includes('module_info') || 
          ble.commandResponse.response.includes('device_name')) {
        console.log("📡 Using existing module info response");
        const parsedModuleInfo = parseModuleInfoResponse(ble.commandResponse.response);
        setModuleInfo(parsedModuleInfo);
      }
    }
  }, [ble?.commandResponse, moduleInfo, isLoadingModuleInfo]);

  // Monitor command responses for WiFi scan results and module info (DD01)
  useEffect(() => {
    if (ble?.commandResponse) {
      console.log("📡 WiFi Setup - Received command response:", ble.commandResponse);
      
      // Check if this is a WiFi scan response
      if (isScanning && 
          ((ble.commandResponse.command.includes('wifi_scan') || 
            ble.commandResponse.response.includes('wifi_scan')) && 
           ble.commandResponse.response.includes('wifi_scaned_devices'))) {
        console.log("📡 Processing WiFi scan command response");
        const parsedNetworks = parseWiFiResponse(ble.commandResponse.response);
        setNetworks(parsedNetworks);
        setIsScanning(false);
        
        if (parsedNetworks.length === 0) {
          setScanError("No networks found or failed to parse response");
        }
      }
      // Check if this is a module info response
      else if (isLoadingModuleInfo && 
               (ble.commandResponse.command.includes('get_module_info') || 
                ble.commandResponse.response.includes('module_info') ||
                ble.commandResponse.response.includes('device_name'))) {
        console.log("📡 Processing module info command response");
        const parsedModuleInfo = parseModuleInfoResponse(ble.commandResponse.response);
        setModuleInfo(parsedModuleInfo);
        setIsLoadingModuleInfo(false);
      }
      else {
        console.log("📡 Command response doesn't match expected types, ignoring");
        console.log("📡 Command field:", ble.commandResponse.command);
        console.log("📡 Response includes wifi_scan:", ble.commandResponse.response.includes('wifi_scan'));
        console.log("📡 Response includes wifi_scaned_devices:", ble.commandResponse.response.includes('wifi_scaned_devices'));
        console.log("📡 Response includes module_info:", ble.commandResponse.response.includes('module_info'));
      }
    }
  }, [ble?.commandResponse, isScanning, isLoadingModuleInfo]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>WiFi Setup</Text>
        <Text style={styles.subtitle}>
          Scan and connect to available WiFi networks
        </Text>

        {/* Current WiFi Connection Status */}
        {moduleInfo && (
          <View style={styles.currentConnectionContainer}>
            <Text style={styles.currentConnectionTitle}>Current Connection</Text>
            {moduleInfo.sta && moduleInfo.sta.ssid ? (
              <View style={styles.currentWifiInfo}>
                <View style={styles.currentWifiHeader}>
                  <Text style={styles.currentWifiSSID}>{moduleInfo.sta.ssid}</Text>
                  <View style={[styles.statusIndicator, 
                    moduleInfo.sta.state === '1' ? styles.statusConnected : styles.statusDisconnected
                  ]}>
                    <Text style={styles.statusText}>
                      {moduleInfo.sta.state === '1' ? 'Connected' : 'Disconnected'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.currentWifiIP}>IP: {moduleInfo.sta.ip}</Text>
                {moduleInfo.sta.gateway && (
                  <Text style={styles.currentWifiIP}>Gateway: {moduleInfo.sta.gateway}</Text>
                )}
              </View>
            ) : (
              <Text style={styles.noConnectionText}>No WiFi connection</Text>
            )}
          </View>
        )}

        {isLoadingModuleInfo && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#ff0000" />
            <Text style={styles.loadingText}>Loading current connection...</Text>
          </View>
        )}

        {/* Scan Button */}
        <TouchableOpacity
          style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
          onPress={startWiFiScan}
          disabled={isScanning || !ble?.isConnected}
        >
          {isScanning ? (
            <View style={styles.scanButtonContent}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.scanButtonText}>Scanning...</Text>
            </View>
          ) : (
            <Text style={styles.scanButtonText}>
              {!ble?.isConnected ? "Not Connected" : "Scan for Networks"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Error Message */}
        {scanError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{scanError}</Text>
          </View>
        )}

        {/* Networks List */}
        {networks.length > 0 && (
          <View style={styles.networksContainer}>
            <Text style={styles.sectionTitle}>
              Available Networks ({networks.length})
            </Text>
            
            {networks.map((network, index) => (
              <TouchableOpacity
                key={`${network.ssid}-${index}`}
                style={styles.networkButton}
                onPress={() => connectToNetwork(network)}
              >
                <View style={styles.networkContent}>
                  {/* WiFi Name */}
                  <Text style={styles.networkName}>{network.ssid}</Text>
                  
                  {/* Network Details */}
                  <View style={styles.networkDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Signal:</Text>
                      <Text style={[styles.detailValue, { color: getSignalColor(network.rssi) }]}>
                        {getSignalStrength(network.rssi)} ({network.rssi} dBm)
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Security:</Text>
                      <Text style={styles.detailValue}>
                        {getAuthModeText(network.authmode)}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Signal Strength Bars */}
                  <View style={styles.signalBars}>
                    {[1, 2, 3, 4].map((bar) => (
                      <View
                        key={bar}
                        style={[
                          styles.signalBar,
                          {
                            backgroundColor:
                              network.rssi >= -50 - (bar - 1) * 15
                                ? getSignalColor(network.rssi)
                                : "#e0e0e0",
                            height: 8 + bar * 3,
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* No Networks Message */}
        {!isScanning && networks.length === 0 && !scanError && (
          <View style={styles.noNetworksContainer}>
            <Text style={styles.noNetworksText}>
              No networks found. Tap "Scan for Networks" to search for available WiFi networks.
            </Text>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
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
    marginBottom: 8,
    color: "#333",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  scanButton: {
    backgroundColor: "#ff0000",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: "center",
  },
  scanButtonDisabled: {
    backgroundColor: "#ccc",
  },
  scanButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scanButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#f44336",
  },
  errorText: {
    color: "#c62828",
    fontSize: 14,
  },
  networksContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  networkButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  networkContent: {
    flexDirection: "column",
  },
  networkName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  networkDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  signalBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    alignSelf: "flex-end",
    marginTop: 8,
  },
  signalBar: {
    width: 4,
    borderRadius: 2,
  },
  noNetworksContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  noNetworksText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  // Current WiFi Connection Styles
  currentConnectionContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  currentConnectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  currentWifiInfo: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
  },
  currentWifiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  currentWifiSSID: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusConnected: {
    backgroundColor: "#d4edda",
  },
  statusDisconnected: {
    backgroundColor: "#f8d7da",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  currentWifiIP: {
    fontSize: 14,
    color: "#666",
  },
  noConnectionText: {
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    padding: 12,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
});
