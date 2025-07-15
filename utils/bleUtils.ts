import { Buffer } from 'buffer';
import { Alert } from 'react-native';
import { BleManager } from 'react-native-ble-plx';

// UUID constants for BLE characteristics
export const BLE_UUIDS = {
  // BM1000 BLE service
  SERVICE: "0000181d-0000-1000-8000-00805f9b34fb",
  
  // Characteristics
  DD01: "0000dd01-0000-1000-8000-00805f9b34fb", // Command response
  DD02: "0000dd02-0000-1000-8000-00805f9b34fb", // P message (weight data)
  DD03: "0000dd03-0000-1000-8000-00805f9b34fb", // R message (display)
  DD04: "0000dd04-0000-1000-8000-00805f9b34fb", // T message (total weight)
  DD08: "0000dd08-0000-1000-8000-00805f9b34fb", // Command characteristic
};

/**
 * Sends a BLE command to the specified characteristic
 * @param peripheralId BLE peripheral ID
 * @param serviceUUID Service UUID
 * @param characteristicUUID Characteristic UUID
 * @param command String command to send
 * @returns Promise resolving when command is sent
 */
export const sendBLECommand = async (
  peripheralId: string,
  serviceUUID: string,
  characteristicUUID: string,
  command: string
): Promise<void> => {
  try {
    const bleManager = new BleManager();
    
    // First check if device is connected before sending command
    const isConnected = await bleManager.isDeviceConnected(peripheralId);
    if (!isConnected) {
      throw new Error("Device is not connected");
    }
    
    // Convert command string to bytes
    const bytes = Buffer.from(command);
    
    // Identify commands that need more time (like module info)
    const isLargeResponseCommand = command.includes('get_module_info');
    const timeoutDuration = isLargeResponseCommand ? 15000 : 5000; // 15 seconds for large responses
    
    // Add timeout handling with Promise.race
    const writePromise = bleManager.writeCharacteristicWithResponseForDevice(
      peripheralId,
      serviceUUID,
      characteristicUUID,
      bytes.toString('base64')
    );
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Command timed out after ${timeoutDuration/1000} seconds`)), 
        timeoutDuration);
    });
    
    // Race between the write operation and the timeout
    await Promise.race([writePromise, timeoutPromise]);
    
    // For large response commands, add a small delay to ensure notification channel is ready
    if (isLargeResponseCommand) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
  } catch (error) {
    console.error(`Error sending BLE command: ${error}`);
    throw error;
  }
};

/**
 * Converts a base64 string to a byte array
 * @param base64 Base64 encoded string
 * @returns Array of numbers (byte values)
 */
export const base64ToBytes = (base64: string): number[] => {
  const binary = Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Array(binary.length);
  
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  return bytes;
};

/**
 * Checks if a characteristic UUID matches the short ID
 * @param shortId Short characteristic ID (e.g., "dd01")
 * @param fullUUID Full characteristic UUID
 * @returns True if matched
 */
export const isCharacteristicMatch = (shortId: string, fullUUID: string): boolean => {
  return fullUUID.toLowerCase().includes(shortId.toLowerCase());
};

/**
 * Helper function to show BLE error alerts
 * @param title Alert title
 * @param error Error object
 * @param fallbackMessage Fallback message if error is not a string
 */
export const showBleErrorAlert = (
  title: string,
  error: any,
  fallbackMessage: string = "An unknown error occurred"
): void => {
  const errorMessage = 
    typeof error === 'string' 
      ? error 
      : error?.message || fallbackMessage;
      
  Alert.alert(title, errorMessage, [{ text: 'OK' }]);
};

/**
 * Format a byte array to hex string for debugging
 * @param bytes Array of numbers (byte values)
 * @returns Hex string representation
 */
export const bytesToHex = (bytes: number[]): string => {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
};