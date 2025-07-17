import React, { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useBLEContext } from "../contexts/BLEContext";

export default function AboutScreen() {
  const { sendBMCommand, commandResponse, isConnected } = useBLEContext();
  const [moduleInfo, setModuleInfo] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Fetch module info when screen opens (only once)
  useEffect(() => {
    if (isConnected) {
      // console.log("🔄 About screen opened, fetching module info...");
      fetchModuleInfo();
    }
  }, []); // Empty dependency array - runs only once when component mounts

  // Watch for command response changes
  useEffect(() => {
    // console.log("🔍 About screen checking commandResponse:", commandResponse);
    if (commandResponse) {
      // console.log("📋 Command:", commandResponse.command);
      // console.log("📋 Response:", commandResponse.response);
      
      // Check if this is the module info response
      // Look for "module_info" in the response since the command field might be empty
      const isModuleInfoResponse = 
        (commandResponse.command && commandResponse.command.includes("get_module_info")) ||
        (commandResponse.response && commandResponse.response.includes("module_info"));
      
      if (isModuleInfoResponse) {
        // console.log("📋 Received module info response:", commandResponse.response);
        
        // Clear the timeout if it exists
        if ((window as any).moduleInfoTimeout) {
          clearTimeout((window as any).moduleInfoTimeout);
          (window as any).moduleInfoTimeout = null;
        }
        
        setModuleInfo(commandResponse.response);
        setLoading(false);
      }
    }
  }, [commandResponse]);

  // Reset module info when disconnected
  useEffect(() => {
    if (!isConnected) {
      setModuleInfo("");
      setLoading(false);
    }
  }, [isConnected]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if ((window as any).moduleInfoTimeout) {
        clearTimeout((window as any).moduleInfoTimeout);
        (window as any).moduleInfoTimeout = null;
      }
    };
  }, []);

  const fetchModuleInfo = async () => {
    if (!isConnected) {
      Alert.alert("Not Connected", "Please connect to a device first");
      return;
    }

    setLoading(true);
    setModuleInfo(""); // Clear previous info
    // console.log("🔄 Starting to fetch module info...");
    
    try {
      const success = await sendBMCommand("bm_ble/get_module_info");
      if (!success) {
        // console.error("❌ Failed to send module info command");
        setLoading(false);
        setModuleInfo("Failed to fetch module information");
        return;
      }
      
      // console.log("✅ Module info command sent successfully");
      
      // Set a timeout to stop loading if no response is received
      const timeoutId = setTimeout(() => {
        // console.log("⏰ Timeout reached, stopping loading");
        setLoading(false);
        if (!moduleInfo) {
          setModuleInfo("Timeout: No response received from device");
        }
      }, 10000); // 10 second timeout
      
      // Store timeout ID so we can clear it if response comes
      (window as any).moduleInfoTimeout = timeoutId;
      
    } catch (error) {
      // console.error("❌ Error sending module info command:", error);
      setLoading(false);
      setModuleInfo("Error fetching module information");
    }
  };

  const parseModuleInfo = (response: string) => {
    try {
      // console.log("🔍 Parsing module info:", response);
      
      // Try to parse as JSON first
      try {
        const jsonResponse = JSON.parse(response);
        if (typeof jsonResponse === 'object' && jsonResponse !== null) {
          // Flatten the JSON structure for display
          const flattenedInfo: { [key: string]: string } = {};
          
          // Function to flatten nested objects
          const flatten = (obj: any, prefix: string = '') => {
            Object.keys(obj).forEach(key => {
              const value = obj[key];
              const newKey = prefix ? `${prefix}_${key}` : key;
              
              if (typeof value === 'object' && value !== null) {
                flatten(value, newKey);
              } else {
                flattenedInfo[newKey] = String(value);
              }
            });
          };
          
          flatten(jsonResponse);
          return flattenedInfo;
        }
      } catch (jsonError) {
        // console.log("Not valid JSON, trying other formats");
      }
      
      // Fallback to key-value pairs parsing (kept for compatibility)
      const lines = response.split('\n').filter(line => line.trim());
      const parsedInfo: { [key: string]: string } = {};
      
      lines.forEach(line => {
        // Handle different separator formats
        if (line.includes(':')) {
          const [key, ...valueParts] = line.split(':');
          parsedInfo[key.trim()] = valueParts.join(':').trim();
        } else if (line.includes('=')) {
          const [key, ...valueParts] = line.split('=');
          parsedInfo[key.trim()] = valueParts.join('=').trim();
        } else if (line.includes('|')) {
          const [key, ...valueParts] = line.split('|');
          parsedInfo[key.trim()] = valueParts.join('|').trim();
        }
      });

      // Return parsed info if we found any key-value pairs
      if (Object.keys(parsedInfo).length > 0) {
        return parsedInfo;
      }

      // If no structured data found, return null to show raw response
      return null;
    } catch (error) {
      // console.error("Error parsing module info:", error);
      return null;
    }
  };

  const renderModuleInfo = () => {
    if (loading) {
      return (
        <View style={styles.infoContainer}>
          <Text style={styles.loadingText}>Loading module information...</Text>
        </View>
      );
    }

    if (!moduleInfo) {
      return (
        <View style={styles.infoContainer}>
          <Text style={styles.noDataText}>No module information available</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchModuleInfo}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Check if it's an error message
    if (moduleInfo.includes("Timeout:") || moduleInfo.includes("Failed to") || moduleInfo.includes("Error")) {
      return (
        <View style={styles.infoContainer}>
          <Text style={styles.errorText}>{moduleInfo}</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchModuleInfo}>
            <Text style={styles.refreshButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const parsedInfo = parseModuleInfo(moduleInfo);
    
    if (parsedInfo) {
      return (
        <View style={styles.infoContainer}>
          {Object.entries(parsedInfo).map(([key, value]) => {
            // Format the key for better readability
            const formattedKey = key
              .replace(/_/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase());
            
            return (
              <View key={key} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{formattedKey}:</Text>
                <Text style={styles.infoValue}>{String(value)}</Text>
              </View>
            );
          })}
        </View>
      );
    }

    return (
      <View style={styles.infoContainer}>
        <Text style={styles.rawResponseLabel}>Raw Response:</Text>
        <Text style={styles.rawResponseText}>{moduleInfo}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>About This Scale</Text>
          <Text style={styles.subtitle}>Module Information</Text>
        </View>

        {renderModuleInfo()}

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.refreshButton, loading && styles.disabledButton]}
            onPress={fetchModuleInfo}
            disabled={loading || !isConnected}
          >
            <Text style={styles.refreshButtonText}>
              {loading ? "Loading..." : "Refresh Info"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.appInfoContainer}>
          <Text style={styles.appInfoTitle}>Application Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Name:</Text>
            <Text style={styles.infoValue}>Bluetooth Weight Scale</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version:</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform:</Text>
            <Text style={styles.infoValue}>React Native (Expo)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Connection:</Text>
            <Text style={[styles.infoValue, isConnected ? styles.connectedText : styles.disconnectedText]}>
              {isConnected ? "Connected" : "Disconnected"}
            </Text>
          </View>
          {commandResponse && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Command:</Text>
              <Text style={styles.infoValue}>{commandResponse.command}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Extra padding to avoid Android bottom bar
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  infoContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: "#666",
    flex: 2,
    textAlign: "right",
  },
  rawResponseLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  rawResponseText: {
    fontSize: 12,
    color: "#666",
    fontFamily: "monospace",
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 6,
    lineHeight: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
  noDataText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginBottom: 20,
  },
  actionContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  refreshButton: {
    backgroundColor: "#ff0000",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  appInfoContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appInfoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  connectedText: {
    color: "#28a745",
    fontWeight: "600",
  },
  disconnectedText: {
    color: "#dc3545",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    color: "#dc3545",
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "600",
  },
});
