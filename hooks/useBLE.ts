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
      console.log("Already scanning...");
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
      console.log("Starting scan...");
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
        console.log("Scan timeout triggered");
        if (bleManager) {
          bleManager.stopDeviceScan();
          console.log("Scan stopped by timeout");
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
      console.log("Scan stopped");
      setIsScanning(false);
    }
  }, [isScanning]);

  // Connect to peripheral
  const connectToPeripheral = useCallback(async (peripheralId: string) => {
    try {
      console.log(`Connecting to peripheral: ${peripheralId}`);
      
      // Connect to device
      const device = await bleManager.connectToDevice(peripheralId);
      console.log("Connected to device");
      
      // Request larger MTU for Android (iOS negotiates automatically)
      if (Platform.OS === 'android') {
        try {
          const mtu = await device.requestMTU(512);
          console.log(`MTU set to: ${mtu} bytes`);
        } catch (mtuError) {
          console.warn("Could not set MTU to 512:", mtuError);
          // Continue anyway, might work with default MTU
        }
      }
      
      // Discover services and characteristics
      const discoveredDevice = await device.discoverAllServicesAndCharacteristics();
      console.log("Discovered services and characteristics");
      
      // Get services
      const services = await discoveredDevice.services();
      console.log("Services:", services.map(s => s.uuid));
      
      // Find our target service
      const targetService = services.find(service => 
        service.uuid.toLowerCase() === BLE_UUIDS.SERVICE.toLowerCase()
      );
      
      if (!targetService) {
        throw new Error("Service not found on device");
      }
      
      // Get characteristics
      const characteristics = await targetService.characteristics();
      console.log("Characteristics:", characteristics.map(c => c.uuid));
      
      // Set up BLE service
      setBleService({
        peripheralId: device.id,
        serviceId: targetService.uuid,
        characteristics: characteristics
      });
      
      // Monitor characteristics for notifications
      setupNotifications(device.id, targetService.uuid, characteristics);
      
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
      console.log("Disconnected from device");
      
      // Update state
      setIsConnected(false);
      setBleService(undefined);
      setRMessageData([]);
      setTMessageData([]);
      setWeightData(defaultWeightData);
      
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
    // For each characteristic we care about, set up notifications
    for (const characteristic of characteristics) {
      // Skip write-only characteristics
      if (!characteristic.isNotifiable) continue;
      
      const charUuid = characteristic.uuid.toLowerCase();
      
      // Check if it's one of our target characteristics
      if (
        charUuid === BLE_UUIDS.DD01.toLowerCase() ||
        charUuid === BLE_UUIDS.DD02.toLowerCase() ||
        charUuid === BLE_UUIDS.DD03.toLowerCase() ||
        charUuid === BLE_UUIDS.DD04.toLowerCase() ||
        charUuid === BLE_UUIDS.DD08.toLowerCase() ||
        charUuid === '0000dd05-0000-1000-8000-00805f9b34fb'
      ) {
        try {
          // Subscribe to notifications
          console.log(`Setting up notifications for ${charUuid}`);
          await bleManager.monitorCharacteristicForDevice(
            peripheralId,
            serviceUuid,
            characteristic.uuid,
            (error, characteristic) => {
              if (error) {
                console.error(`Notification error for ${charUuid}:`, error);
                return;
              }
              
              if (!characteristic?.value) return;
              
              // Handle the notification data
              handleUpdateValueForCharacteristic({
                ...characteristic,
                value: base64ToBytes(characteristic.value)
              });
            }
          );
          
          console.log(`Notifications set up for ${charUuid}`);
        } catch (error) {
          console.error(`Failed to set up notifications for ${charUuid}:`, error);
        }
      }
    }
  };

  // Handle characteristic value updates
  const handleUpdateValueForCharacteristic = (data: any) => {
    // Helper function to check if this is a specific characteristic
    const isCharacteristic = (shortId: string) => {
      return data.uuid.toLowerCase().includes(shortId.toLowerCase());
    };
    if (data.value && Array.isArray(data.value)) {
      // Helper function to check if this is a specific characteristic
      const isCharacteristic = (shortId: string) => {
        return data.uuid.toLowerCase().includes(shortId.toLowerCase());
      };
      
      // J Message (DD05)
      if (isCharacteristic("dd05")) {
        console.log("� Processing dd05 J message data");
        setJMessageData(data.value);
        return;
      }
      // PP Command response (DD08)
      if (isCharacteristic("dd08")) {
        // Assume response is ASCII string
        const responseString = String.fromCharCode(...data.value);
        setPPResponse(responseString);
        console.log("📩 PP Command response (DD08):", responseString);
        return;
      }
      // R Message (Display data)
      if (isCharacteristic("dd03")) {
        console.log("📊 Processing dd03 R message data");
        setRMessageData(data.value);
        console.log("✅ R Message updated with byte array");
        return;
      }
      // T Message (Total weight)
      else if (isCharacteristic("dd04")) {
        console.log("📊 Processing dd04 T message data - raw bytes:", data.value);
        console.log("📊 DD04 data as string:", String.fromCharCode(...data.value));
        
        // Check if this looks like a command echo (starts with '<T' and ends with '>')
        const dataString = String.fromCharCode(...data.value);
        if (dataString.startsWith('<T') && dataString.endsWith('>')) {
          console.log("⚠️ DD04 received command echo, ignoring:", dataString);
          return; // Don't process command echoes as T messages
        }
        
        // Pass the raw byte array directly - similar to R message
        setTMessageData(data.value);
        console.log("✅ T Message updated with byte array");
        
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
        console.log(`📡 DD01 chunk: "${responseChunk.replace(/\n/g, '')}"`);
        console.log(`🔄 Buffer length: ${bufferRef.current.length}, Bracket count: ${runningBracketCount}`);
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
          console.log("✅ Complete response emitted to user");
        } else {
          console.log("🔄 Waiting for more chunks...");
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
            
            // Format the weight string to remove unnecessary leading zeros
            let formattedWeight = weightString;
            try {
              // Parse as float and convert back to string to remove leading zeros
              const weightValue = parseFloat(weightString);
              
              // Handle special case of exactly 0
              if (weightValue === 0) {
                formattedWeight = "0";
                
                // If there's a decimal part in the original, preserve it
                if (weightString.includes('.')) {
                  const decimalPart = weightString.split('.')[1];
                  if (decimalPart) {
                    formattedWeight = `0.${decimalPart}`;
                  }
                }
              } else {
                // Normal case - format without unnecessary leading zeros
                formattedWeight = weightValue.toString();
              }
            } catch (e) {
              console.error("Error formatting weight:", e);
              // Fall back to original string if parsing fails
              formattedWeight = weightString;
            }
            
            // console.log(`Parsed weight: ${weightString}, formatted: ${formattedWeight}, flags: stable=${isStable}`);
            
            // Update weight data state
            setWeightData({
              weight: formattedWeight, // Use the formatted weight without leading zeros
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
    bleManager,
    startScan,
    stopScan,
    connectToPeripheral,
    disconnectFromPeripheral,
    sendTCommand,
    sendBMCommand,
    checkConnectionHealth,
    setIsConnected,
  };
};

export default useBLE;
