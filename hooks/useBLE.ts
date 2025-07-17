import { Buffer } from 'buffer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { BleManager, Characteristic, Device } from 'react-native-ble-plx';
import DeviceInfo from 'react-native-device-info';
import { PERMISSIONS, requestMultiple } from 'react-native-permissions';
import { BLE_UUIDS, base64ToBytes } from '../utils/bleUtils'; // console.log("🔄 Accumulating response, size:", newResponse.length);
// Type for extended peripheral properties
export type ExtendedPeripheral = Device & {
  isConnected?: boolean;
  name?: string;
  manufacturerData?: string;
  services?: string[];
  lastSeen?: Date;
};

// Peripheral services type
export type PeripheralServices = {
  peripheralId: string;
  serviceId: string;
  characteristics: Characteristic[];
};

// Command response type
export type CommandResponse = {
  command: string;
  response: string;
  timestamp: Date;
};

// Weight data type
export interface WeightData {
  weight: string;
  unit: string;
  isStable: boolean;
  isTare: boolean;
  isZero: boolean;
  isNegative: boolean;
  isMinimum: boolean;
  isFixedTare: boolean;
  hasADCError: boolean;
  lastUpdate: Date;
}

// Create the BLE manager
const bleManager = new BleManager();

// Default weight data
const defaultWeightData: WeightData = {
  weight: "0.00",
  unit: "kg",
  isStable: false,
  isTare: false,
  isZero: false,
  isNegative: false,
  isMinimum: false,
  isFixedTare: false,
  hasADCError: false,
  lastUpdate: new Date()
};

export const useBLE = () => {
  // State variables
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [peripherals, setPeripherals] = useState<Map<string, ExtendedPeripheral>>(new Map());
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [bleService, setBleService] = useState<PeripheralServices | undefined>(undefined);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [rMessageData, setRMessageData] = useState<number[]>([]);
  const [tMessageData, setTMessageData] = useState<number[]>([]);
  // J Message state
  const [jMessageData, setJMessageData] = useState<number[]>([]);
  const [weightData, setWeightData] = useState<WeightData>(defaultWeightData);
  const [commandResponse, setCommandResponse] = useState<CommandResponse | null>(null);
  // PP Command response (DD08)
  const [ppResponse, setPPResponse] = useState<string>("");
  const [lastCommand, setLastCommand] = useState<string>("");
  const [permissionsGranted, setPermissionsGranted] = useState<boolean>(false);
  const [accumulatedResponse, setAccumulatedResponse] = useState<string>("");
  const bufferRef = useRef("");
  const bracketCountRef = useRef(0);
  const [responseTimeout, setResponseTimeout] = useState<number | null>(null);
  const [notificationsReady, setNotificationsReady] = useState<boolean>(false);
  
  // Callback for PP response processing
  const ppResponseCallbackRef = useRef<((response: string) => void) | null>(null);

  // Request permissions
  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'android') {
      const apiLevel = await DeviceInfo.getApiLevel();
      
      if (apiLevel < 31) {
        // Android 11 and below
        const result = await requestMultiple([
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
        ]);
        
        const isGranted = 
          result[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION] === 'granted' ||
          result[PERMISSIONS.ANDROID.BLUETOOTH_SCAN] === 'granted' ||
          result[PERMISSIONS.ANDROID.BLUETOOTH_CONNECT] === 'granted';
        
        setPermissionsGranted(isGranted);
        return isGranted;
      } else {
        // Android 12+
        const result = await requestMultiple([
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
        ]);
        
        const isGranted = 
          result[PERMISSIONS.ANDROID.BLUETOOTH_SCAN] === 'granted' &&
          result[PERMISSIONS.ANDROID.BLUETOOTH_CONNECT] === 'granted';
        
        setPermissionsGranted(isGranted);
        return isGranted;
      }
    } else {
      // iOS
      setPermissionsGranted(true);
      return true;
    }
  }, []);

  // Handle scanning
  const startScan = useCallback(async () => {
    // Check if already scanning
    if (isScanning) {
      // console.log("Already scanning...");
      return;
    }
    
    // Request permissions if needed
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      Alert.alert("Permission Required", 
        "Bluetooth scanning requires location permissions. Please grant permissions to continue.");
      return;
    }
    
    // Clear previously found peripherals
    setPeripherals(new Map());
    
    // Start scanning
    try {
      // console.log("Starting scan...");
      setIsScanning(true);
      
      // Scan for devices
      bleManager.startDeviceScan(
        ["181D"],
        { allowDuplicates: false },
        (error, device) => {
          // Handle scan error
          if (error) {
            console.error("Scan error:", error);
            stopScan();
            return;
          }
          
          // Skip devices without a name
          if (!device || !device.name || device.name === "") return;
          
          // Update peripherals map
          setPeripherals(prevPeripherals => {
            const updatedPeripherals = new Map(prevPeripherals);
            
            // Use the device object directly as an ExtendedPeripheral
            const extendedDevice = device as ExtendedPeripheral;
            
            // Only update the properties we need to change
            extendedDevice.name = device.name ?? '';
            extendedDevice.lastSeen = new Date();
            
            // Add to map
            updatedPeripherals.set(device.id, extendedDevice);
            
            return updatedPeripherals;
          });
        }
      );
      
      // Stop scan after 10 seconds with explicit function
      const timeoutId = setTimeout(() => {
        // console.log("Scan timeout triggered");
        if (bleManager) {
          bleManager.stopDeviceScan();
          // console.log("Scan stopped by timeout");
          setIsScanning(false);
        }
      }, 10000);
      
      // Return cleanup function that clears the timeout if component unmounts
      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error("Failed to start scan:", error);
      setIsScanning(false);
    }
  }, [bleManager, requestPermissions]); // Remove isScanning dependency

  // Stop scanning
  const stopScan = useCallback(() => {
    if (isScanning) {
      bleManager.stopDeviceScan();
      // console.log("Scan stopped");
      setIsScanning(false);
    }
  }, [isScanning]);

  // Connect to peripheral
  const connectToPeripheral = useCallback(async (peripheralId: string) => {
    try {
      // console.log(`Connecting to peripheral: ${peripheralId}`);
      
      // Connect to device
      const device = await bleManager.connectToDevice(peripheralId);
      // console.log("Connected to device");
      
      // Request larger MTU for Android (iOS negotiates automatically)
      if (Platform.OS === 'android') {
        try {
          const mtu = await device.requestMTU(512);
          // console.log(`MTU set to: ${mtu} bytes`);
        } catch (mtuError) {
          console.warn("Could not set MTU to 512:", mtuError);
          // Continue anyway, might work with default MTU
        }
      }
      
      // Discover services and characteristics
      const discoveredDevice = await device.discoverAllServicesAndCharacteristics();
      // console.log("Discovered services and characteristics");
      
      // Get services
      const services = await discoveredDevice.services();
      // console.log("Services:", services.map(s => s.uuid));
      
      // Find our target service
      const targetService = services.find(service => 
        service.uuid.toLowerCase() === BLE_UUIDS.SERVICE.toLowerCase()
      );
      
      if (!targetService) {
        throw new Error("Service not found on device");
      }
      
      // Get characteristics
      const characteristics = await targetService.characteristics();
      // console.log("Characteristics:", characteristics.map(c => c.uuid));
      
      // Set up BLE service
      setBleService({
        peripheralId: device.id,
        serviceId: targetService.uuid,
        characteristics: characteristics
      });
      
      // Monitor characteristics for notifications
      setupNotifications(device.id, targetService.uuid, characteristics);
      
      // Set up device state change monitoring
      device.onDisconnected((error, device) => {
        // console.log("🔌 Device disconnected event triggered:", device?.id);
        if (error) {
          console.error("Disconnection error:", error);
        }
        
        // Update connection state
        setIsConnected(false);
        setBleService(undefined);
        setConnectionError("Device disconnected");
        
        // Clear weight data and responses
        setWeightData(defaultWeightData);
        setPPResponse("");
        setRMessageData([]);
        setTMessageData([]);
        setJMessageData([]);
        
        // console.log("🔄 Connection state reset due to disconnection");
      });
      
      // Update connected state
      setIsConnected(true);
      setConnectionError(null);
      
      return true;
    } catch (error: any) {
      console.error("Connection failed:", error);
      setConnectionError(error.message || "Failed to connect to device");
      setIsConnected(false);
      setBleService(undefined);
      return false;
    }
  }, []);

  // Disconnect from peripheral
  const disconnectFromPeripheral = useCallback(async () => {
    if (!bleService || !bleService.peripheralId) return;
    
    try {
      // Disconnect device (this will also stop notifications)
      await bleManager.cancelDeviceConnection(bleService.peripheralId);
      // console.log("Disconnected from device");
      
      // Update state
      setIsConnected(false);
      setBleService(undefined);
      setRMessageData([]);
      setTMessageData([]);
      setWeightData(defaultWeightData);
      setNotificationsReady(false);
      
      return true;
    } catch (error) {
      console.error("Disconnect failed:", error);
      return false;
    }
  }, [bleService]);

  // Setup characteristic notifications
  const setupNotifications = async (
    peripheralId: string,
    serviceUuid: string,
    characteristics: Characteristic[]
  ) => {
    console.log("Setting up notifications for characteristics:", characteristics.map(c => c.uuid));
    
    // For each characteristic we care about, set up notifications
    for (const characteristic of characteristics) {
      // Skip write-only characteristics
      if (!characteristic.isNotifiable) {
        console.log(`Skipping ${characteristic.uuid} - not notifiable`);
        continue;
      }
      
      const charUuid = characteristic.uuid.toLowerCase();
      console.log(`Checking characteristic: ${charUuid}`);
      
      // Check if it's one of our target characteristics
      if (
        charUuid === BLE_UUIDS.DD01.toLowerCase() ||
        charUuid === BLE_UUIDS.DD02.toLowerCase() ||
        charUuid === BLE_UUIDS.DD03.toLowerCase() ||
        charUuid === BLE_UUIDS.DD04.toLowerCase() ||
        charUuid === BLE_UUIDS.DD05.toLowerCase() ||
        charUuid === BLE_UUIDS.DD08.toLowerCase()
      ) {
        try {
          // Subscribe to notifications
          console.log(`✅ Setting up notifications for ${charUuid}`);
          await bleManager.monitorCharacteristicForDevice(
            peripheralId,
            serviceUuid,
            characteristic.uuid,
            (error, characteristic) => {
              if (error) {
                console.error(`❌ Notification error for ${charUuid}:`, error);
                return;
              }
              
              if (!characteristic?.value) {
                console.log(`⚠️ No value received for ${charUuid}`);
                return;
              }
              
              console.log(`📨 Received notification from ${charUuid}, value length: ${characteristic.value.length}`);
              
              // Handle the notification data
              handleUpdateValueForCharacteristic({
                ...characteristic,
                value: base64ToBytes(characteristic.value)
              });
            }
          );
          
          console.log(`✅ Notifications successfully set up for ${charUuid}`);
        } catch (error) {
          console.error(`❌ Failed to set up notifications for ${charUuid}:`, error);
        }
      } else {
        console.log(`⏭️ Skipping ${charUuid} - not a target characteristic`);
      }
    }
    
    // Set notifications ready after all characteristics are processed
    console.log("📡 All notifications setup complete");
    setNotificationsReady(true);
  };

  // Handle characteristic value updates
  const handleUpdateValueForCharacteristic = (data: any) => {
    // console.log(`🔄 Processing notification from ${data.uuid}, data length: ${data.value?.length || 0}`);
    
    // Helper function to check if this is a specific characteristic
    const isCharacteristic = (shortId: string) => {
      return data.uuid.toLowerCase().includes(shortId.toLowerCase());
    };
    
    if (data.value && Array.isArray(data.value)) {
      // J Message (DD05)
      if (isCharacteristic("dd05")) {
        // console.log("🔍 Processing dd05 J message data");
        setJMessageData(data.value);
        return;
      }
      // PP Command response (DD08)
      if (isCharacteristic("dd08")) {
        console.log("📩 ========== DD08 PP COMMAND RESPONSE ==========");
        console.log("📩 Raw notification from DD08:");
        console.log("📩 - Data length:", data.value?.length || 0);
        console.log("📩 - Raw bytes:", data.value);
        console.log("📩 - Bytes as decimal:", data.value?.map((b: number) => b.toString()).join(', '));
        
        // Convert response to hex string for display
        const hexResponse = data.value.map((byte: number) => 
          byte.toString(16).padStart(2, '0').toUpperCase()
        ).join('');
        console.log("📩 - Hex representation:", hexResponse);
        
        // Try to interpret as ASCII for debugging
        const asciiAttempt = data.value.map((byte: number) => {
          if (byte >= 32 && byte <= 126) {
            return String.fromCharCode(byte);
          } else {
            return `[${byte}]`;
          }
        }).join('');
        console.log("📩 - ASCII interpretation:", asciiAttempt);
        
        // Check if this looks like a command echo or actual response
        if (data.value?.length > 0) {
          const firstByte = data.value[0];
          const lastByte = data.value[data.value.length - 1];
          console.log("📩 - First byte: 0x" + firstByte.toString(16).padStart(2, '0').toUpperCase() + " (" + firstByte + ")");
          console.log("📩 - Last byte: 0x" + lastByte.toString(16).padStart(2, '0').toUpperCase() + " (" + lastByte + ")");
          
          // Check for common PP response patterns
          if (firstByte === 0xDD && data.value[1] === 0xDD) {
            console.log("📩 - ✅ Looks like a valid PP response (starts with DDDD)");
          } else if (firstByte === 0x06) {
            console.log("📩 - ✅ Looks like an ACK response (0x06)");
          } else if (firstByte === 0x15) {
            console.log("📩 - ❌ Looks like a NAK response (0x15)");
          } else {
            console.log("📩 - ⚠️ Unknown response pattern");
          }
        }
        
        const responseString = `Response: ${hexResponse}`;
        setPPResponse(responseString);
        console.log("📩 ✅ setPPResponse called with:", responseString);
        
        // Call the callback immediately with the fresh response
        if (ppResponseCallbackRef.current) {
          console.log("📩 ✅ Calling PP response callback with:", responseString);
          ppResponseCallbackRef.current(responseString);
        }
        
        console.log("📩 ============================================");
        return;
      }
      // R Message (Display data)
      if (isCharacteristic("dd03")) {
        // console.log("📊 Processing dd03 R message data");
        setRMessageData(data.value);
        // console.log("✅ R Message updated with byte array");
        return;
      }
      // T Message (Total weight)
      else if (isCharacteristic("dd04")) {
        // console.log("📊 Processing dd04 T message data - raw bytes:", data.value);
        // console.log("📊 DD04 data as string:", String.fromCharCode(...data.value));
        
        // Check if this looks like a command echo (starts with '<T' and ends with '>')
        const dataString = String.fromCharCode(...data.value);
        if (dataString.startsWith('<T') && dataString.endsWith('>')) {
          // console.log("⚠️ DD04 received command echo, ignoring:", dataString);
          return; // Don't process command echoes as T messages
        }
        
        // Pass the raw byte array directly - similar to R message
        setTMessageData(data.value);
        // console.log("✅ T Message updated with byte array");
        
        return;
      }
      // Command response
      else if (isCharacteristic("dd01")) {
        // --- Robust bracket-counting buffer for DD01 ---
        const responseChunk = String.fromCharCode(...data.value);
        // Use ref for buffer and bracket count
        bufferRef.current += responseChunk;
        let runningBracketCount = bracketCountRef.current;
        for (let i = 0; i < responseChunk.length; i++) {
          if (responseChunk[i] === '{') runningBracketCount++;
          if (responseChunk[i] === '}') runningBracketCount--;
        }
        bracketCountRef.current = runningBracketCount;
        setAccumulatedResponse(bufferRef.current); // for UI display only
        // console.log(`📡 DD01 chunk: "${responseChunk.replace(/\n/g, '')}"`);
        // console.log(`🔄 Buffer length: ${bufferRef.current.length}, Bracket count: ${runningBracketCount}`);
        // Only emit when bracket count returns to zero and at least one brace was seen
        if (runningBracketCount === 0 && bufferRef.current.includes('{')) {
          setCommandResponse({
            command: lastCommand,
            response: bufferRef.current,
            timestamp: new Date()
          });
          bufferRef.current = "";
          bracketCountRef.current = 0;
          setAccumulatedResponse("");
          // console.log("✅ Complete response emitted to user");
        } else {
          // console.log("🔄 Waiting for more chunks...");
        }
        return;
      }
      // P Message (Weight data)
      else if (isCharacteristic("dd02")) {
        // console.log("📊 Processing dd02 P message data");
        // console.log("P message raw bytes:", data.value);
        
        try {
          // Check if this is a P message (should start with ASCII 'P' which is 0x50)
          if (data.value[0] === 0x50) {
            // Extract the ASCII weight value (bytes after P until status byte)
            let weightString = "";
            let i = 1;
            
            // Read ASCII bytes until we encounter a non-ASCII digit or decimal point
            // Usually there are 7 bytes (6 digits + decimal point)
            while (i < data.value.length - 2) { // -2 to account for CR LF at end
              const byte = data.value[i];
              // Check if it's a digit (ASCII 0-9) or decimal point
              if ((byte >= 0x30 && byte <= 0x39) || byte === 0x2E) {
                weightString += String.fromCharCode(byte);
                i++;
              } else {
                break; // Exit when we hit a non-digit, non-decimal character
              }
            }
            
            // Status byte comes after the weight value
            const statusByte = data.value[i];
            // console.log(`Status byte: 0x${statusByte.toString(16)}, Binary: ${statusByte.toString(2).padStart(8, '0')}`);
            
            // Extract flags from status byte
            const isStable = (statusByte & 0x01) !== 0;
            const isTare = (statusByte & 0x02) !== 0;
            const isZero = (statusByte & 0x04) !== 0;
            const isNegative = (statusByte & 0x08) !== 0;
            const isMinimum = (statusByte & 0x10) !== 0;
            const isFixedTare = (statusByte & 0x20) !== 0;
            const hasADCError = (statusByte & 0x40) !== 0;
            
            // Format the weight string to ensure consistent decimal places and remove leading zeros
            let formattedWeight = weightString;
            try {
              // Parse as float to validate it's a number and remove leading zeros
              const weightValue = parseFloat(weightString);
              
              if (!isNaN(weightValue)) {
                // Check if the original weight string has decimals
                if (weightString.includes('.')) {
                  // Parse the number to remove leading zeros, then format to maintain decimal places
                  const decimalPlaces = weightString.split('.')[1]?.length || 3;
                  formattedWeight = weightValue.toFixed(Math.max(decimalPlaces, 3));
                } else {
                  // If no decimal point, add .000 for consistency
                  formattedWeight = weightValue.toFixed(3);
                }
              } else {
                // If parsing fails, keep original string
                formattedWeight = weightString;
              }
            } catch (e) {
              console.error("Error formatting weight:", e);
              // Fall back to original string if parsing fails
              formattedWeight = weightString;
            }
            
            // console.log(`Parsed weight: ${weightString}, formatted: ${formattedWeight}, flags: stable=${isStable}`);
            
            // Update weight data state
            setWeightData({
              weight: formattedWeight, // Use the formatted weight with consistent decimals
              unit: "kg", // Default unit, adjust if your scale provides the unit
              isStable,
              isTare,
              isZero,
              isNegative,
              isMinimum,
              isFixedTare,
              hasADCError,
              lastUpdate: new Date()
            });
            
            console.log("✅ Weight data updated from P message");
          } else {
            console.warn("Received message doesn't start with P, ignoring");
          }
        } catch (error) {
          console.error("Error parsing P message:", error);
        }
        
        return;
      }
      // Unknown characteristic
      else {
        console.log("⚠️ Received data from unknown characteristic:", data.uuid);
        console.log("Value:", data.value);
      }
    }
  };

  // Send T command to DD08 (fire-and-forget)
  const sendTCommand = useCallback(async (command: string) => {
    setCommandResponse(null);
    if (!bleService || !bleService.peripheralId) {
      console.error("Cannot send T command: Device not connected");
      Alert.alert("Not Connected", "Please connect to a device first");
      return false;
    }
    try {
      console.log(`Sending T command to DD08: ${command}`);
      const cmdChar = bleService.characteristics.find(c =>
        c.uuid.toLowerCase() === BLE_UUIDS.DD08.toLowerCase()
      );
      if (!cmdChar) {
        console.error(`Available characteristics:`, bleService.characteristics.map(c => c.uuid));
        throw new Error(`Target characteristic ${BLE_UUIDS.DD08} not found`);
      }
      const bytes = Buffer.from(command);
      await bleManager.writeCharacteristicWithoutResponseForDevice(
        bleService.peripheralId,
        bleService.serviceId,
        cmdChar.uuid,
        bytes.toString('base64')
      );
      console.log("T Command sent successfully");
      return true;
    } catch (error: any) {
      console.error("Failed to send T command:", error);
      Alert.alert("Command Failed", error.message || "Failed to send T command");
      return false;
    }
  }, [bleService]);

  // Send bm_ble command to DD01 (expects response)
  const sendBMCommand = useCallback(async (command: string) => {
    setCommandResponse(null);
    if (!bleService || !bleService.peripheralId) {
      console.error("Cannot send BM command: Device not connected");
      Alert.alert("Not Connected", "Please connect to a device first");
      return false;
    }
    try {
      console.log(`Sending BM command to DD01: ${command}`);
      const cmdChar = bleService.characteristics.find(c =>
        c.uuid.toLowerCase() === BLE_UUIDS.DD01.toLowerCase()
      );
      if (!cmdChar) {
        console.error(`Available characteristics:`, bleService.characteristics.map(c => c.uuid));
        throw new Error(`Target characteristic ${BLE_UUIDS.DD01} not found`);
      }
      
      // Send command string - BLE library requires base64 but scale receives original string
      const bytes = Buffer.from(command, 'utf8');
      const base64Data = bytes.toString('base64');
      
      // Verify what the scale will actually receive
      const decodedCheck = Buffer.from(base64Data, 'base64').toString('utf8');
      console.log(`📤 Sending: "${command}"`);
      console.log(`📤 Base64: "${base64Data}"`);
      console.log(`📤 Scale receives: "${decodedCheck}"`);
      
      await bleManager.writeCharacteristicWithoutResponseForDevice(
        bleService.peripheralId,
        bleService.serviceId,
        cmdChar.uuid,
        base64Data
      );
      setLastCommand(command);
      setAccumulatedResponse(""); // Clear any previous response
      console.log("BM Command sent successfully, waiting for response...");
      return true;
    } catch (error: any) {
      console.error("Failed to send BM command:", error);
      Alert.alert("Command Failed", error.message || "Failed to send BM command");
      return false;
    }
  }, [bleService]);

  // Send PP command to DD08 (byte array format)
  const sendPPCommand = useCallback(async (bytes: number[]) => {
    if (!bleService || !bleService.peripheralId) {
      console.error("Cannot send PP command: Device not connected");
      Alert.alert("Not Connected", "Please connect to a device first");
      return false;
    }
    try {
      console.log("📤 ========== SENDING PP COMMAND ==========");
      const hexString = bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
      console.log(`📤 Command as hex: ${hexString}`);
      console.log(`📤 Command as bytes: [${bytes.join(', ')}]`);
      console.log(`📤 Command length: ${bytes.length} bytes`);
      
      // Parse the command structure for debugging
      if (bytes.length >= 3 && bytes[0] === 0xDD && bytes[1] === 0xDD) {
        console.log("📤 Command structure analysis:");
        console.log(`📤 - Header: ${bytes[0].toString(16).toUpperCase()}${bytes[1].toString(16).toUpperCase()}`);
        if (bytes.length > 2) console.log(`📤 - Command type: 0x${bytes[2].toString(16).padStart(2, '0').toUpperCase()}`);
        if (bytes.length > 3) console.log(`📤 - Sub-command: 0x${bytes[3].toString(16).padStart(2, '0').toUpperCase()}`);
        if (bytes.length > 8) console.log(`📤 - Data payload: [${bytes.slice(7, -2).join(', ')}]`);
        if (bytes.length >= 2) {
          const checksumByte = bytes[bytes.length - 2];
          const endByte = bytes[bytes.length - 1];
          console.log(`📤 - Checksum: 0x${checksumByte.toString(16).padStart(2, '0').toUpperCase()}`);
          console.log(`📤 - End byte: 0x${endByte.toString(16).padStart(2, '0').toUpperCase()}`);
        }
      }
      
      const cmdChar = bleService.characteristics.find(c =>
        c.uuid.toLowerCase() === BLE_UUIDS.DD08.toLowerCase()
      );
      if (!cmdChar) {
        console.error(`Available characteristics:`, bleService.characteristics.map(c => c.uuid));
        throw new Error(`Target characteristic ${BLE_UUIDS.DD08} not found`);
      }
      
      // Convert byte array to base64 for transmission
      const buffer = Buffer.from(bytes);
      const base64String = buffer.toString('base64');
      console.log(`📤 Base64 for BLE transmission: ${base64String}`);
      console.log("📤 Sending to characteristic DD08...");
      
      await bleManager.writeCharacteristicWithoutResponseForDevice(
        bleService.peripheralId,
        bleService.serviceId,
        cmdChar.uuid,
        base64String
      );
      console.log("📤 ✅ PP Command sent successfully to DD08");
      console.log("📤 ⏳ Waiting for response from DD08...");
      console.log("📤 ==========================================");
      return true;
    } catch (error: any) {
      console.error("📤 ❌ Failed to send PP command:", error);
      Alert.alert("Command Failed", error.message || "Failed to send PP command");
      return false;
    }
  }, [bleService]);

  // Check connection health
  const checkConnectionHealth = useCallback(async () => {
    if (!bleService || !bleService.peripheralId) {
      return false;
    }
    
    try {
      // Try to read a characteristic to see if connection is still alive
      const charToRead = bleService.characteristics.find(c => c.isReadable);
      
      if (!charToRead) {
        return isConnected; // Assume connected if no readable characteristics
      }
      
      await bleManager.readCharacteristicForDevice(
        bleService.peripheralId,
        bleService.serviceId,
        charToRead.uuid
      );
      
      return true; // Connection is healthy
    } catch (error) {
      console.error("Connection health check failed:", error);
      
      // Connection is broken, update state
      setIsConnected(false);
      setBleService(undefined);
      
      return false;
    }
  }, [bleService, isConnected]);

  // Add an event listener for disconnection events
  useEffect(() => {
    const subscription = bleManager.onDeviceDisconnected(
      bleService?.peripheralId || '',
      (error, device) => {
        console.log('🔌 Device disconnected event triggered:', device?.id);
        
        // Force update connected state
        setIsConnected(false);
        setBleService(undefined);
        
        // Log the disconnection error if available
        if (error) {
          console.error('Disconnection error:', error);
          setConnectionError(error.message || 'Device disconnected unexpectedly');
        }
      }
    );
    
    // Clean up subscription
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [bleService?.peripheralId, bleManager]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel all subscriptions and disconnect
      if (bleService && bleService.peripheralId) {
        bleManager.cancelDeviceConnection(bleService.peripheralId)
          .catch(error => console.error("Error disconnecting on cleanup:", error));
      }
    };
  }, [bleService]);

  // Set PP response callback
  const setPPResponseCallback = useCallback((callback: ((response: string) => void) | null) => {
    ppResponseCallbackRef.current = callback;
  }, []);

  // Return the hook API
  return {
    isScanning,
    peripherals,
    isConnected,
    bleService,
    connectionError,
    rMessageData,
    tMessageData,
    jMessageData,
    weightData,
    commandResponse,
    ppResponse,
    notificationsReady,
    bleManager,
    startScan,
    stopScan,
    connectToPeripheral,
    disconnectFromPeripheral,
    sendTCommand,
    sendBMCommand,
    sendPPCommand,
    checkConnectionHealth,
    setIsConnected,
    setPPResponseCallback,
  };
};

export default useBLE;
