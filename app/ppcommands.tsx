import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import CommandModal from "../components/ppcommands/CommandModal";
import FrameSwitch from "../components/ppcommands/FrameSwitch";
import HelpModal from "../components/ppcommands/HelpModal";
import ResponseSection from "../components/ppcommands/ResponseSection";
import {
  CommandAction,
  COMPort,
  FrameState,
  FrameType,
  HelpModalType,
  SendPPCommandParams,
} from "../components/ppcommands/types";
import {
  calculateChecksum,
  categories,
  frameSubkeys,
  ppCommands,
} from "../components/ppcommands/utils";
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
  const [brightnessDurationModalVisible, setBrightnessDurationModalVisible] =
    useState(false);
  const [brightnessIntensityModalVisible, setBrightnessIntensityModalVisible] =
    useState(false);
  const [brightnessMinweightModalVisible, setBrightnessMinweightModalVisible] =
    useState(false);
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
  const [loadingFrames, setLoadingFrames] = useState<{
    [key: string]: boolean;
  }>({});

  const ble = useBLEContext();

  // Read all frame states when connected
  useEffect(() => {
    if (ble?.isConnected && ble?.bleService) {
      readAllFrameStates();
    }
  }, [ble?.isConnected, ble?.bleService]);

  // Parse frame response and validate it matches expected frame type and COM port
  const parseAndValidateFrameResponse = (
    response: string,
    expectedFrameType: FrameType,
    expectedComPort: COMPort
  ): { isValid: boolean; isEnabled: boolean } => {
    try {
      // Remove "Response: " prefix if present and any spaces
      const cleanResponse = response
        .replace(/^Response:\s*/, "")
        .replace(/\s+/g, "");

      // Convert hex string to byte array
      const bytes: number[] = [];
      for (let i = 0; i < cleanResponse.length; i += 2) {
        const hexByte = cleanResponse.substr(i, 2);
        const byte = parseInt(hexByte, 16);
        if (!isNaN(byte)) {
          bytes.push(byte);
        }
      }

      if (bytes.length < 11) {
        return { isValid: false, isEnabled: false };
      }

      // Parse the response structure
      const subkey = bytes[6];
      const comPort = bytes[7];
      const frameStatus = bytes[8];

      // Get expected subkey for the frame type
      const expectedSubkey = frameSubkeys[expectedFrameType];
      const expectedComByte = expectedComPort === "COM 1" ? 0x01 : 0x02;

      // Validate that this response matches what we're expecting
      const isValid = subkey === expectedSubkey && comPort === expectedComByte;
      const isEnabled = frameStatus === 0x01;

      /*console.log(`=== FRAME VALIDATION ===`);
      console.log(
        `Expected: ${expectedFrameType} (0x${expectedSubkey
          .toString(16)
          .padStart(2, "0")
          .toUpperCase()}) ${expectedComPort} (0x${expectedComByte
          .toString(16)
          .padStart(2, "0")
          .toUpperCase()})`
      );
      console.log(
        `Received: Subkey 0x${subkey
          .toString(16)
          .padStart(2, "0")
          .toUpperCase()}, COM 0x${comPort
          .toString(16)
          .padStart(2, "0")
          .toUpperCase()}, Status 0x${frameStatus
          .toString(16)
          .padStart(2, "0")
          .toUpperCase()}`
      );
      console.log(`Valid: ${isValid}, Enabled: ${isEnabled}`);*/

      return { isValid, isEnabled };
    } catch (error) {
      console.error("Error parsing/validating frame response:", error);
      return { isValid: false, isEnabled: false };
    }
  };

  // Parse frame response and determine which frame type it is
  const parseFrameResponseGeneric = (
    response: string,
    expectedComPort: COMPort
  ): { isValid: boolean; isEnabled: boolean; frameType: FrameType | null } => {
    try {
      //console.log(`🔍 parseFrameResponseGeneric called with response: ${response}, expectedComPort: ${expectedComPort}`);
      
      // Remove "Response: " prefix if present and any spaces
      const cleanResponse = response
        .replace(/^Response:\s*/, "")
        .replace(/\s+/g, "");

      //console.log(`🔍 Clean response: ${cleanResponse}`);

      // Convert hex string to byte array
      const bytes: number[] = [];
      for (let i = 0; i < cleanResponse.length; i += 2) {
        const hexByte = cleanResponse.substr(i, 2);
        const byte = parseInt(hexByte, 16);
        if (!isNaN(byte)) {
          bytes.push(byte);
        }
      }

      //console.log(`🔍 Parsed bytes: [${bytes.join(', ')}]`);

      if (bytes.length < 11) {
        //console.log(`🔍 Response too short: ${bytes.length} bytes`);
        return { isValid: false, isEnabled: false, frameType: null };
      }

      // Parse the response structure
      const subkey = bytes[6];
      const comPort = bytes[7];
      const frameStatus = bytes[8];

      //console.log(`🔍 Subkey: 0x${subkey.toString(16).padStart(2, "0").toUpperCase()}`);
      //console.log(`🔍 COM Port: 0x${comPort.toString(16).padStart(2, "0").toUpperCase()}`);
      //console.log(`🔍 Frame Status: 0x${frameStatus.toString(16).padStart(2, "0").toUpperCase()}`);

      const expectedComByte = expectedComPort === "COM 1" ? 0x01 : 0x02;
      //console.log(`🔍 Expected COM byte: 0x${expectedComByte.toString(16).padStart(2, "0").toUpperCase()}`);

      // Check if COM port matches
      if (comPort !== expectedComByte) {
        //console.log(`🔍 COM port mismatch! Expected: 0x${expectedComByte.toString(16).padStart(2, "0").toUpperCase()}, Got: 0x${comPort.toString(16).padStart(2, "0").toUpperCase()}`);
        return { isValid: false, isEnabled: false, frameType: null };
      }

      // Find which frame type this subkey belongs to
      const frameType = Object.keys(frameSubkeys).find(
        (key) => frameSubkeys[key as FrameType] === subkey
      ) as FrameType | undefined;

      //console.log(`Looking for subkey 0x${subkey.toString(16).padStart(2, "0").toUpperCase()} in frameSubkeys:`, frameSubkeys);
      //console.log(`Found frame type: ${frameType}`);

      if (!frameType) {
        //console.log(`❌ No frame type found for subkey 0x${subkey.toString(16).padStart(2, "0").toUpperCase()}`);
        return { isValid: false, isEnabled: false, frameType: null };
      }

      const isEnabled = frameStatus === 0x01;

      /*console.log(`=== GENERIC FRAME PARSING ===`);
      console.log(
        `Received: Frame ${frameType} (0x${subkey
          .toString(16)
          .padStart(2, "0")
          .toUpperCase()}) ${expectedComPort} (0x${expectedComByte
          .toString(16)
          .padStart(2, "0")
          .toUpperCase()}), Status 0x${frameStatus
          .toString(16)
          .padStart(2, "0")
          .toUpperCase()}`
      );
      console.log(`Frame ${frameType} is ${isEnabled ? "ENABLED" : "DISABLED"}`);*/

      return { isValid: true, isEnabled, frameType };
    } catch (error) {
      console.error("Error parsing generic frame response:", error);
      return { isValid: false, isEnabled: false, frameType: null };
    }
  };

  // Store the current response listener
  const [currentResponseListener, setCurrentResponseListener] = useState<{
    frameType: FrameType;
    comPort: COMPort;
    resolve: (value: void | PromiseLike<void>) => void;
    startTime: number; // Track when we started waiting
  } | null>(null);

  // Track the last processed response to avoid processing the same response twice
  const [lastProcessedResponse, setLastProcessedResponse] = useState<string | null>(null);

  // Effect to listen for PP responses and match them to the current frame request
  useEffect(() => {
    if (currentResponseListener && ble.ppResponse && ble.ppResponse !== lastProcessedResponse) {
      const { frameType, comPort, resolve, startTime } = currentResponseListener;

      // Only process responses that arrived after we started waiting
      const responseTime = Date.now();
      if (responseTime < startTime) {
        //console.log(`⏰ Ignoring old response for ${frameType} ${comPort}`);
        return;
      }

      /*console.log(
        `Got response while waiting for ${frameType} ${comPort}:`,
        ble.ppResponse
      );*/

      // Mark this response as processed
      setLastProcessedResponse(ble.ppResponse);

      // Parse and validate the response
      const validation = parseAndValidateFrameResponse(
        ble.ppResponse,
        frameType,
        comPort
      );

      if (validation.isValid) {
        console.log(
          `✅ Valid response for ${frameType} ${comPort}: ${
            validation.isEnabled ? "ENABLED" : "DISABLED"
          }`
        );

        // Update the state with the validated result
        setFrameStates((prev) => {
          const newState = {
            ...prev,
            [frameType]: {
              ...prev[frameType],
              [comPort]: validation.isEnabled,
            },
          };
          //console.log(`Updated frame states for ${frameType} ${comPort}:`, newState[frameType]);
          return newState;
        });

        // Clear the listener and resolve
        setCurrentResponseListener(null);
        resolve();
      } else {
        console.log(`❌ Invalid response for ${frameType} ${comPort}, continuing to wait...`);
      }
    }
  }, [ble.ppResponse, currentResponseListener, lastProcessedResponse]);

  // Wait for a specific frame response with 1 second timeout
  const waitForFrameResponse = async (
    frameType: FrameType,
    comPort: COMPort
  ): Promise<void> => {
    return new Promise((resolve) => {
      //console.log(`Setting up listener for ${frameType} ${comPort}`);

      // Set up the response listener with current timestamp
      setCurrentResponseListener({ frameType, comPort, resolve, startTime: Date.now() });

      // Set timeout to clear listener and resolve after 1 second
      setTimeout(() => {
        setCurrentResponseListener((current) => {
          if (
            current &&
            current.frameType === frameType &&
            current.comPort === comPort
          ) {
            //console.log(`⏰ Timeout waiting for ${frameType} ${comPort} response after 1 second`);

            // Set state to null (unknown) if we can't get a response
            setFrameStates((prev) => ({
              ...prev,
              [frameType]: {
                ...prev[frameType],
                [comPort]: null,
              },
            }));

            // Clear listener and resolve
            resolve();
            return null;
          }
          return current;
        });
      }, 1000);
    });
  };

  const readFrameStatesForCOM = async (comPort: COMPort) => {
    if (!ble?.isConnected || !ble?.bleService) return;

    const frameTypes: FrameType[] = ["P", "T", "R", "A", "Z", "J"];

    for (const frameType of frameTypes) {
      const key = `${frameType}-${comPort}`;
      setLoadingFrames((prev) => ({ ...prev, [key]: true }));

      try {
        // Send the command
        await sendPPCommand({
          type: "frame-read",
          com: comPort,
          frameType,
        });

        // Wait for new response using callback mechanism
        await new Promise<void>((resolve) => {
          let responseReceived = false;
          
          //console.log(`🔍 Setting up callback for ${frameType} ${comPort}`);
          
          // Set up callback to receive response immediately when BLE handler gets it
          ble.setPPResponseCallback((response: string) => {
            if (responseReceived) {
              console.log(`🔍 Callback called but already processed for ${frameType} ${comPort}`);
              return;
            }
            
            responseReceived = true;
            //console.log(`📥 Callback received response for ${frameType} ${comPort}: ${response}`);
            
            // Parse the response to determine which frame it's for
            const parsedResponse = parseFrameResponseGeneric(response, comPort);
            
            if (parsedResponse.isValid && parsedResponse.frameType) {
              //console.log(`✅ Valid response for frame ${parsedResponse.frameType} ${comPort}: ${parsedResponse.isEnabled ? "ENABLED" : "DISABLED"}`);
              
              // Update the state for the actual frame type received
              const receivedFrameType = parsedResponse.frameType;
             //console.log(`🔄 Updating state for frame ${receivedFrameType} ${comPort} to ${parsedResponse.isEnabled}`);
              
              setFrameStates((prev) => {
                //console.log(`🔄 Previous state for ${receivedFrameType}:`, prev[receivedFrameType]);
                
                const newState = {
                  ...prev,
                  [receivedFrameType]: {
                    ...prev[receivedFrameType],
                    [comPort]: parsedResponse.isEnabled,
                  },
                };
                
                //console.log(`🔄 New state for ${receivedFrameType}:`, newState[receivedFrameType]);
                return newState;
              });
              
              // Clear callback and resolve
              ble.setPPResponseCallback(null);
              resolve();
            } else {
              //console.log(`❌ Invalid response for ${frameType} ${comPort}: ${response}`);
              //console.log(`❌ parsedResponse.isValid: ${parsedResponse.isValid}, parsedResponse.frameType: ${parsedResponse.frameType}`);
              // Still resolve even if invalid to move to next frame
              ble.setPPResponseCallback(null);
              resolve();
            }
          });
          
          // Add a timeout as backup (30 seconds)
          setTimeout(() => {
            if (!responseReceived) {
              //console.log(`⏰ Timeout reached for ${frameType} ${comPort}, clearing callback`);
              ble.setPPResponseCallback(null);
              resolve();
            }
          }, 2000);
        });

        // Short delay between commands
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(
          `Error reading ${frameType} frame for ${comPort}:`,
          error
        );
      } finally {
        setLoadingFrames((prev) => ({ ...prev, [key]: false }));
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

  const filteredCommands =
    selectedCategory === "COM"
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
      } else if (type === "get-random-key") {
        // Get Random Key: DDDD020000FE0003
        arr = [0xdd, 0xdd, 0x02, 0x00, 0x00, 0xfe, 0x00];
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

  // Parse frame response to determine if frame is enabled (used for manual testing)
  const parseFrameResponse = (response: string): boolean => {
    try {
      //console.log("=== FRAME RESPONSE PARSING ===");
      //console.log("Raw response:", response);

      // Remove "Response: " prefix if present and any spaces
      const cleanResponse = response
        .replace(/^Response:\s*/, "")
        .replace(/\s+/g, "");
      //console.log("Clean response (no spaces):", cleanResponse);

      // Convert hex string to byte array
      const bytes: number[] = [];
      for (let i = 0; i < cleanResponse.length; i += 2) {
        const hexByte = cleanResponse.substr(i, 2);
        const byte = parseInt(hexByte, 16);
        if (!isNaN(byte)) {
          bytes.push(byte);
        }
      }

      //console.log(
      //  "Parsed bytes:",
      //  bytes
      //    .map((b) => `0x${b.toString(16).padStart(2, "0").toUpperCase()}`)
      //    .join(" ")
      //);
      //console.log("Byte array:", bytes);

      if (bytes.length < 11) {
        console.log(
          "Response too short, expected at least 11 bytes, got:",
          bytes.length
        );
        return false;
      }

      // Expected format: DDDD020200010901003703
      // [DD DD 02 02 00 01 09 01 00 37 03]
      // Position 6: Subkey (frame type - 09 = Z frame)
      // Position 7: COM port (01 = COM1, 02 = COM2)
      // Position 8: Frame enabled status (01 = enabled, 00 = disabled)
      // Position 9: Checksum
      // Position 10: End marker (03)

      const subkey = bytes[6];
      const comPort = bytes[7];
      const frameStatus = bytes[8];
      const checksum = bytes[9];

      /*console.log(
        `Subkey: 0x${subkey.toString(16).padStart(2, "0").toUpperCase()}`
      );
      console.log(
        `COM Port: 0x${comPort.toString(16).padStart(2, "0").toUpperCase()}`
      );
      console.log(
        `Frame Status: 0x${frameStatus
          .toString(16)
          .padStart(2, "0")
          .toUpperCase()}`
      );
      console.log(
        `Checksum: 0x${checksum.toString(16).padStart(2, "0").toUpperCase()}`
      );*/

      const isEnabled = frameStatus === 0x01;
      /*console.log(
        `Frame is ${
          isEnabled
            ? "ENABLED (0x01)"
            : frameStatus === 0x00
            ? "DISABLED (0x00)"
            : "UNKNOWN"
        }`
      );*/

      return isEnabled;
    } catch (error) {
      console.error("Error parsing frame response:", error);
      return false;
    }
  };

  // Test function to manually parse a response string
  const testResponseParsing = (testResponse: string) => {
    // console.log("=== TESTING RESPONSE PARSING ===");
    const result = parseFrameResponse(testResponse);
    // console.log(`Test result: ${result}`);
    return result;
  };

  // Command handlers
  const handleBaudrateCommand = async (
    action: CommandAction,
    value?: string
  ) => {
    if (action === "Write" && value) {
      await sendPPCommand({
        type: "baudrate-write",
        com: selectedCOM,
        value: parseInt(value, 10),
      });
    } else {
      await sendPPCommand({
        type: "baudrate-read",
        com: selectedCOM,
      });
    }
  };

  const handleDatabitsCommand = async (
    action: CommandAction,
    value?: string
  ) => {
    if (action === "Write" && value) {
      await sendPPCommand({
        type: "databits-write",
        com: selectedCOM,
        value: parseInt(value, 10),
      });
    } else {
      await sendPPCommand({
        type: "databits-read",
        com: selectedCOM,
      });
    }
  };

  const handleParityCommand = async (action: CommandAction, value?: string) => {
    if (action === "Write" && value) {
      await sendPPCommand({
        type: "parity-write",
        com: selectedCOM,
        value: parseInt(value, 10),
      });
    } else {
      await sendPPCommand({
        type: "parity-read",
        com: selectedCOM,
      });
    }
  };

  const handleStopbitsCommand = async (
    action: CommandAction,
    value?: string
  ) => {
    if (action === "Write" && value) {
      await sendPPCommand({
        type: "stopbits-write",
        com: selectedCOM,
        value: parseInt(value, 10),
      });
    } else {
      await sendPPCommand({
        type: "stopbits-read",
        com: selectedCOM,
      });
    }
  };

  const handleProtocolCommand = async (
    action: CommandAction,
    value?: string
  ) => {
    if (action === "Write" && value) {
      await sendPPCommand({
        type: "protocol-write",
        com: selectedCOM,
        value: parseInt(value, 10),
      });
    } else {
      await sendPPCommand({
        type: "protocol-read",
        com: selectedCOM,
      });
    }
  };

  const handleFrameToggle = async (
    frameType: FrameType,
    comPort: COMPort,
    newValue: boolean
  ) => {
    try {
      await sendPPCommand({
        type: "frame-write",
        com: comPort,
        frameType,
        value: newValue ? 1 : 0,
      });

      // Update local state immediately for better UX
      setFrameStates((prev) => ({
        ...prev,
        [frameType]: {
          ...prev[frameType],
          [comPort]: newValue,
        },
      }));
    } catch (error) {
      console.error(`Error toggling ${frameType} frame for ${comPort}:`, error);
    }
  };

  // Display command handlers
  const handleBrightnessDurationCommand = async (
    action: CommandAction,
    value?: string
  ) => {
    if (action === "Write" && value) {
      await sendPPCommand({
        type: "brightness-duration-write",
        value: parseInt(value, 10),
      });
    } else {
      await sendPPCommand({
        type: "brightness-duration-read",
      });
    }
  };

  const handleBrightnessIntensityCommand = async (
    action: CommandAction,
    value?: string
  ) => {
    if (action === "Write" && value) {
      await sendPPCommand({
        type: "brightness-intensity-write",
        value: parseInt(value, 10),
      });
    } else {
      await sendPPCommand({
        type: "brightness-intensity-read",
      });
    }
  };

  const handleBrightnessMinweightCommand = async (
    action: CommandAction,
    value?: string
  ) => {
    if (action === "Write" && value) {
      await sendPPCommand({
        type: "brightness-minweight-write",
        value: parseInt(value, 10),
      });
    } else {
      await sendPPCommand({
        type: "brightness-minweight-read",
      });
    }
  };

  const handleKgSymbolCommand = async (
    action: CommandAction,
    value?: string
  ) => {
    if (action === "Write" && value) {
      await sendPPCommand({
        type: "kg-symbol-write",
        value: parseInt(value, 10),
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

  // Special Weight command handlers
  const handleGetRandomKey = async () => {
    await sendPPCommand({ type: "get-random-key" });
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
                <Text style={styles.commandButtonText}>
                  Write/Read Baudrate
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 12 }}>
              <TouchableOpacity
                style={styles.commandButton}
                onPress={() => setDatabitsModalVisible(true)}
              >
                <Text style={styles.commandButtonText}>
                  Write/Read Databits
                </Text>
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
                <Text style={styles.commandButtonText}>
                  Write/Read Stopbits
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 12 }}>
              <TouchableOpacity
                style={styles.commandButton}
                onPress={() => setProtocolModalVisible(true)}
              >
                <Text style={styles.commandButtonText}>
                  Write/Read Protocol
                </Text>
              </TouchableOpacity>
            </View>

            {/* Frame Controls */}
            <View style={{ marginTop: 20, marginBottom: 12 }}>
              <View style={styles.frameSectionHeader}>
                <Text style={styles.sectionTitle}>
                  Frame Controls - {selectedCOM}
                </Text>
                <TouchableOpacity
                  style={styles.refreshButton}
                  //onPress={() => readFrameStatesForCOM(selectedCOM)}
                >
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
              {(["P", "T", "R", "A", "Z", "J"] as FrameType[]).map(
                (frameType) => (
                  <View key={frameType} style={styles.frameRow}>
                    <FrameSwitch
                      frameType={frameType}
                      comPort={selectedCOM}
                      isEnabled={frameStates[frameType][selectedCOM]}
                      onToggle={handleFrameToggle}
                      isLoading={loadingFrames[`${frameType}-${selectedCOM}`]}
                    />
                  </View>
                )
              )}
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
                <Text style={styles.commandButtonText}>
                  Write/Read Brightness Duration
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 12 }}>
              <TouchableOpacity
                style={styles.commandButton}
                onPress={() => setBrightnessIntensityModalVisible(true)}
              >
                <Text style={styles.commandButtonText}>
                  Write/Read Brightness Intensity
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 12 }}>
              <TouchableOpacity
                style={styles.commandButton}
                onPress={() => setBrightnessMinweightModalVisible(true)}
              >
                <Text style={styles.commandButtonText}>
                  Write/Read Brightness Min Weight
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 12 }}>
              <TouchableOpacity
                style={styles.commandButton}
                onPress={() => setKgSymbolModalVisible(true)}
              >
                <Text style={styles.commandButtonText}>
                  Set/Clear KG Symbol
                </Text>
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

        {/* Special Configs section */}
        {selectedCategory === "Special Configs" && (
          <>
            <View style={{ marginBottom: 12 }}>
              <TouchableOpacity
                style={styles.commandButton}
                onPress={handleGetRandomKey}
              >
                <Text style={styles.commandButtonText}>Get Random Key</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Other categories */}
        {selectedCategory !== "COM" &&
          selectedCategory !== "Display" &&
          selectedCategory !== "Buzzer" &&
          selectedCategory !== "Special Configs" && (
            <View style={styles.commandsContainer}>
              {filteredCommands.length === 0 ? (
                <Text
                  style={{ textAlign: "center", color: "#888", marginTop: 20 }}
                >
                  No commands in this category.
                </Text>
              ) : (
                filteredCommands.map((btn, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.otherCommandButton}
                    onPress={() =>
                      sendPPCommand({ type: "raw", rawCommand: btn.command })
                    }
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
