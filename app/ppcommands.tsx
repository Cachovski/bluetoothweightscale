import React, { useEffect, useState } from "react";
import {
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import CommandModal from "../components/ppcommands/CommandModal";
import FrameSwitch from "../components/ppcommands/FrameSwitch";
import HelpModal from "../components/ppcommands/HelpModal";
import ResponseSection from "../components/ppcommands/ResponseSection";
import { CommandAction, COMPort, FrameState, FrameType, HelpModalType, SendPPCommandParams } from "../components/ppcommands/types";
import { calculateChecksum, categories, frameSubkeys, ppCommands } from "../components/ppcommands/utils";
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
  const [protocolModalVisible, setProtocolModalVisible] = useState(false);
  
  // Display modal states
  const [brightnessDurationModalVisible, setBrightnessDurationModalVisible] = useState(false);
  const [brightnessIntensityModalVisible, setBrightnessIntensityModalVisible] = useState(false);
  const [brightnessMinweightModalVisible, setBrightnessMinweightModalVisible] = useState(false);
  const [kgSymbolModalVisible, setKgSymbolModalVisible] = useState(false);
  
  // Frame state management
  const [frameStates, setFrameStates] = useState<FrameState>({
    P: { "COM 1": null, "COM 2": null },
    T: { "COM 1": null, "COM 2": null },
    R: { "COM 1": null, "COM 2": null },
    A: { "COM 1": null, "COM 2": null },
    Z: { "COM 1": null, "COM 2": null },
    J: { "COM 1": null, "COM 2": null },
  });
  const [loadingFrames, setLoadingFrames] = useState<{ [key: string]: boolean }>({});
  
  const ble = useBLEContext();

  // Read all frame states when connected
  useEffect(() => {
    if (ble?.isConnected && ble?.bleService) {
      readAllFrameStates();
    }
  }, [ble?.isConnected, ble?.bleService]);

  const readFrameStatesForCOM = async (comPort: COMPort) => {
    if (!ble?.isConnected || !ble?.bleService) return;
    
    const frameTypes: FrameType[] = ["P", "T", "R", "A", "Z", "J"];
    
    for (const frameType of frameTypes) {
      const key = `${frameType}-${comPort}`;
      setLoadingFrames(prev => ({ ...prev, [key]: true }));
      
      try {
        await sendPPCommand({
          type: "frame-read",
          com: comPort,
          frameType,
        });
        
        // Small delay between commands to avoid overwhelming the device
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error reading ${frameType} frame for ${comPort}:`, error);
      } finally {
        setLoadingFrames(prev => ({ ...prev, [key]: false }));
      }
    }
  };

  const readAllFrameStates = async () => {
    if (!ble?.isConnected || !ble?.bleService) return;
    
    const comPorts: COMPort[] = ["COM 1", "COM 2"];
    
    for (const comPort of comPorts) {
      await readFrameStatesForCOM(comPort);
    }
  };

  const filteredCommands = selectedCategory === "COM"
    ? []
    : ppCommands.filter((cmd) => cmd.category === selectedCategory);

  // Generic PP command sender
  async function sendPPCommand({
    type,
    com,
    value,
    rawCommand,
    frameType,
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
      } else if (type === "protocol-write") {
        // Write Protocol: DDDD0202010104(data)checksum03
        // [0xdd,0xdd,0x02,0x02,0x01,0x01,0x04, comByte, valueByte, checksum, 0x03]
        const comByte = com === "COM 1" ? 0x01 : 0x02;
        arr = [0xdd, 0xdd, 0x02, 0x02, 0x01, 0x01, 0x04, comByte, value ?? 0];
      } else if (type === "protocol-read") {
        // Read Protocol: DDDD0201000104(data)checksum03
        // [0xdd,0xdd,0x02,0x01,0x00,0x01,0x04, comByte, checksum, 0x03]
        const comByte = com === "COM 1" ? 0x01 : 0x02;
        arr = [0xdd, 0xdd, 0x02, 0x01, 0x00, 0x01, 0x04, comByte];
      } else if (type === "frame-write" && frameType) {
        // Write Frame: Enable/Disable frame
        const comByte = com === "COM 1" ? 0x01 : 0x02;
        const subkey = frameSubkeys[frameType];
        arr = [0xdd, 0xdd, 0x02, 0x02, 0x01, 0x01, subkey, comByte, value ?? 0];
      } else if (type === "frame-read" && frameType) {
        // Read Frame: Get frame state
        const comByte = com === "COM 1" ? 0x01 : 0x02;
        const subkey = frameSubkeys[frameType];
        arr = [0xdd, 0xdd, 0x02, 0x01, 0x00, 0x01, subkey, comByte];
      } else if (type === "brightness-duration-write") {
        // Write Brightness Duration: DDDD020101040(data)checksum03
        arr = [0xdd, 0xdd, 0x02, 0x01, 0x01, 0x04, 0x00, value ?? 0];
      } else if (type === "brightness-duration-read") {
        // Read Brightness Duration: DDDD020000040checksum03
        arr = [0xdd, 0xdd, 0x02, 0x00, 0x00, 0x04, 0x00];
      } else if (type === "brightness-intensity-write") {
        // Write Brightness Intensity: DDDD020101041(data)checksum03
        arr = [0xdd, 0xdd, 0x02, 0x01, 0x01, 0x04, 0x01, value ?? 0];
      } else if (type === "brightness-intensity-read") {
        // Read Brightness Intensity: DDDD020000041checksum03
        arr = [0xdd, 0xdd, 0x02, 0x00, 0x00, 0x04, 0x01];
      } else if (type === "brightness-minweight-write") {
        // Write Brightness Min Weight: DDDD020501042(data)checksum03
        arr = [0xdd, 0xdd, 0x02, 0x05, 0x01, 0x04, 0x02, value ?? 0];
      } else if (type === "brightness-minweight-read") {
        // Read Brightness Min Weight: DDDD020000042checksum03
        arr = [0xdd, 0xdd, 0x02, 0x00, 0x00, 0x04, 0x02];
      } else if (type === "kg-symbol-write") {
        // Write KG Symbol: DDDD020101043(data)checksum03
        arr = [0xdd, 0xdd, 0x02, 0x01, 0x01, 0x04, 0x03, value ?? 0];
      } else if (type === "buzzer-right-sound") {
        // Buzzer Right Sound: DDDD020001050003
        arr = [0xdd, 0xdd, 0x02, 0x00, 0x01, 0x05, 0x00];
      } else if (type === "buzzer-error-sound") {
        // Buzzer Error Sound: DDDD020001050103
        arr = [0xdd, 0xdd, 0x02, 0x00, 0x01, 0x05, 0x01];
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
      
      // Parse response for frame read commands
      if (type === "frame-read" && frameType && com) {
        // Wait for response with multiple attempts
        const checkResponse = (attempt: number = 1) => {
          const response = ble.ppResponse;
          console.log(`Attempt ${attempt}: Checking response for ${frameType} ${com}`);
          
          if (response && response.length > 0) {
            console.log(`Frame read response for ${frameType} ${com}:`, response);
            
            // Parse the response to get frame state
            const frameEnabled = parseFrameResponse(response);
            console.log(`Parsed frame ${frameType} ${com} as:`, frameEnabled);
            
            // Verify the response is for the correct COM port
            const cleanResponse = response.replace(/^Response:\s*/, "").replace(/\s+/g, "");
            const bytes: number[] = [];
            for (let i = 0; i < cleanResponse.length; i += 2) {
              const hexByte = cleanResponse.substr(i, 2);
              const byte = parseInt(hexByte, 16);
              if (!isNaN(byte)) {
                bytes.push(byte);
              }
            }
            
            // Check if the response is for the correct COM port
            if (bytes.length >= 8) {
              const responseCOM = bytes[7];
              const expectedCOM = com === "COM 1" ? 0x01 : 0x02;
              
              if (responseCOM === expectedCOM) {
                console.log(`Response COM matches expected COM: ${com}`);
                
                setFrameStates(prev => {
                  const newState = {
                    ...prev,
                    [frameType]: {
                      ...prev[frameType],
                      [com]: frameEnabled
                    }
                  };
                  console.log(`Updated frame states for ${frameType} ${com}:`, newState[frameType]);
                  return newState;
                });
              } else {
                console.log(`Response COM (0x${responseCOM.toString(16)}) doesn't match expected COM (0x${expectedCOM.toString(16)})`);
                // Try again as this might be a response for a different COM
                if (attempt < 3) {
                  setTimeout(() => checkResponse(attempt + 1), 500);
                }
              }
            }
          } else {
            console.log(`No response received for ${frameType} ${com} (attempt ${attempt})`);
            
            // Try again after a short delay, up to 3 attempts
            if (attempt < 3) {
              setTimeout(() => checkResponse(attempt + 1), 500);
            } else {
              console.log(`Failed to get response for ${frameType} ${com} after 3 attempts`);
              // Set state to null (unknown) if we can't get a response
              setFrameStates(prev => ({
                ...prev,
                [frameType]: {
                  ...prev[frameType],
                  [com]: null
                }
              }));
            }
          }
        };
        
        // Start checking after initial delay
        setTimeout(() => checkResponse(1), 800);
      }
    } catch (e: any) {
      alert(e.message || "Failed to send command");
    } finally {
      setSending(false);
    }
  }

  // Parse frame response to determine if frame is enabled
  const parseFrameResponse = (response: string): boolean => {
    // Parse response to find frame status
    try {
      console.log("=== FRAME RESPONSE PARSING ===");
      console.log("Raw response:", response);
      
      // Remove "Response: " prefix if present and any spaces
      const cleanResponse = response.replace(/^Response:\s*/, "").replace(/\s+/g, "");
      console.log("Clean response (no spaces):", cleanResponse);
      
      // Convert hex string to byte array
      const bytes: number[] = [];
      for (let i = 0; i < cleanResponse.length; i += 2) {
        const hexByte = cleanResponse.substr(i, 2);
        const byte = parseInt(hexByte, 16);
        if (!isNaN(byte)) {
          bytes.push(byte);
        }
      }
      
      console.log("Parsed bytes:", bytes.map(b => `0x${b.toString(16).padStart(2, '0').toUpperCase()}`).join(' '));
      console.log("Byte array:", bytes);
      
      if (bytes.length < 10) {
        console.log("Response too short, expected at least 10 bytes, got:", bytes.length);
        return false;
      }
      
      // Expected format: DDDD0202000107010138
      // [DD DD 02 02 00 01 07 01 01 38]
      // Position 7: COM port (01 = COM1, 02 = COM2)
      // Position 8: Frame enabled status (01 = enabled, 00 = disabled)
      // Position 9: Checksum
      
      const comPort = bytes[7];
      const frameStatus = bytes[8];
      const checksum = bytes[9];
      
      console.log(`COM Port: 0x${comPort.toString(16).padStart(2, '0').toUpperCase()}`);
      console.log(`Frame Status: 0x${frameStatus.toString(16).padStart(2, '0').toUpperCase()}`);
      console.log(`Checksum: 0x${checksum.toString(16).padStart(2, '0').toUpperCase()}`);
      
      const isEnabled = frameStatus === 0x01;
      console.log(`Frame is ${isEnabled ? 'ENABLED (0x01)' : frameStatus === 0x00 ? 'DISABLED (0x00)' : 'UNKNOWN'}`);
      
      // Only return true if explicitly 0x01, false for 0x00 or anything else
      return isEnabled;
      
    } catch (error) {
      console.error("Error parsing frame response:", error);
    }
    
    return false; // Default to disabled if we can't parse
  };

  // Test function to manually parse a response string
  const testResponseParsing = (testResponse: string) => {
    console.log("=== TESTING RESPONSE PARSING ===");
    const result = parseFrameResponse(testResponse);
    console.log(`Test result: ${result}`);
    return result;
  };

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

  const handleProtocolCommand = async (action: CommandAction, value?: string) => {
    if (action === "Write" && value) {
      await sendPPCommand({ 
        type: "protocol-write", 
        com: selectedCOM, 
        value: parseInt(value, 10) 
      });
    } else {
      await sendPPCommand({ 
        type: "protocol-read", 
        com: selectedCOM 
      });
    }
  };

  const handleFrameToggle = async (frameType: FrameType, comPort: COMPort, newValue: boolean) => {
    try {
      await sendPPCommand({
        type: "frame-write",
        com: comPort,
        frameType,
        value: newValue ? 1 : 0
      });
      
      // Update local state immediately for better UX
      setFrameStates(prev => ({
        ...prev,
        [frameType]: {
          ...prev[frameType],
          [comPort]: newValue
        }
      }));
    } catch (error) {
      console.error(`Error toggling ${frameType} frame for ${comPort}:`, error);
    }
  };

  // Display command handlers
  const handleBrightnessDurationCommand = async (action: CommandAction, value?: string) => {
    if (action === "Write" && value) {
      await sendPPCommand({ 
        type: "brightness-duration-write", 
        value: parseInt(value, 10) 
      });
    } else {
      await sendPPCommand({ 
        type: "brightness-duration-read" 
      });
    }
  };

  const handleBrightnessIntensityCommand = async (action: CommandAction, value?: string) => {
    if (action === "Write" && value) {
      await sendPPCommand({ 
        type: "brightness-intensity-write", 
        value: parseInt(value, 10) 
      });
    } else {
      await sendPPCommand({ 
        type: "brightness-intensity-read" 
      });
    }
  };

  const handleBrightnessMinweightCommand = async (action: CommandAction, value?: string) => {
    if (action === "Write" && value) {
      await sendPPCommand({ 
        type: "brightness-minweight-write", 
        value: parseInt(value, 10) 
      });
    } else {
      await sendPPCommand({ 
        type: "brightness-minweight-read" 
      });
    }
  };

  const handleKgSymbolCommand = async (action: CommandAction, value?: string) => {
    if (action === "Write" && value) {
      await sendPPCommand({ 
        type: "kg-symbol-write", 
        value: parseInt(value, 10) 
      });
    }
  };

  // Buzzer command handlers
  const handleBuzzerRightSound = async () => {
    await sendPPCommand({ type: "buzzer-right-sound" });
  };

  const handleBuzzerErrorSound = async () => {
    await sendPPCommand({ type: "buzzer-error-sound" });
  };

  const showHelp = (type: HelpModalType) => {
    setHelpModalType(type);
    setHelpModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>PP Commands</Text>
        
        {/* Category selector */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item: cat }) => (
            <TouchableOpacity
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
          )}
        />

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
          
          <View style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={styles.commandButton}
              onPress={() => setProtocolModalVisible(true)}
            >
              <Text style={styles.commandButtonText}>Write/Read Protocol</Text>
            </TouchableOpacity>
          </View>
          
          {/* Frame Controls */}
          <View style={{ marginTop: 20, marginBottom: 12 }}>
            <View style={styles.frameSectionHeader}>
              <Text style={styles.sectionTitle}>Frame Controls - {selectedCOM}</Text>
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={() => {
                    console.log("Testing response parsing...");
                    // Test with frame enabled for COM1
                    testResponseParsing("DDDD0202000107010138");
                    // Test with frame disabled for COM1
                    testResponseParsing("DDDD0202000107010039");
                    // Test with frame enabled for COM2
                    testResponseParsing("DDDD0202000107020137");
                    // Test with frame disabled for COM2
                    testResponseParsing("DDDD020200010702003A");
                    // Test with Response: prefix
                    testResponseParsing("Response: DDDD0202000107010138");
                  }}
                >
                  <Text style={styles.debugButtonText}>Test</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={() => readFrameStatesForCOM(selectedCOM)}
                >
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            </View>
            {(["P", "T", "R", "A", "Z", "J"] as FrameType[]).map((frameType) => (
              <View key={frameType} style={styles.frameRow}>
                <FrameSwitch
                  frameType={frameType}
                  comPort={selectedCOM}
                  isEnabled={frameStates[frameType][selectedCOM]}
                  onToggle={handleFrameToggle}
                  isLoading={loadingFrames[`${frameType}-${selectedCOM}`]}
                />
              </View>
            ))}
          </View>
        </>
      )}

      {/* Display section */}
      {selectedCategory === "Display" && (
        <>
          <View style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={styles.commandButton}
              onPress={() => setBrightnessDurationModalVisible(true)}
            >
              <Text style={styles.commandButtonText}>Write/Read Brightness Duration</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={styles.commandButton}
              onPress={() => setBrightnessIntensityModalVisible(true)}
            >
              <Text style={styles.commandButtonText}>Write/Read Brightness Intensity</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={styles.commandButton}
              onPress={() => setBrightnessMinweightModalVisible(true)}
            >
              <Text style={styles.commandButtonText}>Write/Read Brightness Min Weight</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={styles.commandButton}
              onPress={() => setKgSymbolModalVisible(true)}
            >
              <Text style={styles.commandButtonText}>Set/Clear KG Symbol</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Buzzer section */}
      {selectedCategory === "Buzzer" && (
        <>
          <View style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={styles.commandButton}
              onPress={handleBuzzerRightSound}
            >
              <Text style={styles.commandButtonText}>Right Sound</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={styles.commandButton}
              onPress={handleBuzzerErrorSound}
            >
              <Text style={styles.commandButtonText}>Error Sound</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Other categories */}
      {selectedCategory !== "COM" && selectedCategory !== "Display" && selectedCategory !== "Buzzer" && (
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

      <CommandModal
        visible={protocolModalVisible}
        onClose={() => setProtocolModalVisible(false)}
        onConfirm={handleProtocolCommand}
        title="Write/Read Protocol"
        valueRange="0-5"
        validationPattern={/^[0-5]?$/}
        helpModalType="protocol"
        onShowHelp={showHelp}
      />

      {/* Display Modals */}
      <CommandModal
        visible={brightnessDurationModalVisible}
        onClose={() => setBrightnessDurationModalVisible(false)}
        onConfirm={handleBrightnessDurationCommand}
        title="Write/Read Brightness Duration"
        valueRange="0-5"
        validationPattern={/^[0-5]?$/}
        helpModalType="brightness-duration"
        onShowHelp={showHelp}
      />

      <CommandModal
        visible={brightnessIntensityModalVisible}
        onClose={() => setBrightnessIntensityModalVisible(false)}
        onConfirm={handleBrightnessIntensityCommand}
        title="Write/Read Brightness Intensity"
        valueRange="0-100"
        validationPattern={/^([0-9]|[1-9][0-9]|100)?$/}
        helpModalType="brightness-intensity"
        onShowHelp={showHelp}
      />

      <CommandModal
        visible={brightnessMinweightModalVisible}
        onClose={() => setBrightnessMinweightModalVisible(false)}
        onConfirm={handleBrightnessMinweightCommand}
        title="Write/Read Brightness Min Weight"
        valueRange="0-1"
        validationPattern={/^[0-1]?$/}
        helpModalType="brightness-minweight"
        onShowHelp={showHelp}
      />

      <CommandModal
        visible={kgSymbolModalVisible}
        onClose={() => setKgSymbolModalVisible(false)}
        onConfirm={handleKgSymbolCommand}
        title="Set/Clear KG Symbol"
        valueRange="0-1"
        validationPattern={/^[0-1]?$/}
        helpModalType="kg-symbol"
        onShowHelp={showHelp}
        writeOnly={true}
      />

      <HelpModal
        visible={helpModalVisible}
        onClose={() => setHelpModalVisible(false)}
        type={helpModalType}
      />
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  frameRow: {
    marginBottom: 8,
  },
  frameSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  refreshButton: {
    backgroundColor: "#FF0000",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 8,
  },
  debugButton: {
    backgroundColor: "#FF0000",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  debugButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
