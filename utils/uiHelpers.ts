import { Alert, Platform } from 'react-native';
import { PeripheralServices } from '../hooks/useBLE';

/**
 * Show error alert with a friendly message
 * 
 * @param title Alert title
 * @param message Alert message 
 * @param onOk Optional callback function when OK is pressed
 */
export const showErrorAlert = (
  title: string, 
  message: string, 
  onOk?: () => void
) => {
  Alert.alert(
    title,
    message,
    [{ text: 'OK', onPress: onOk }],
    { cancelable: false }
  );
};

/**
 * Show success alert with a friendly message
 * 
 * @param title Alert title
 * @param message Alert message
 * @param onOk Optional callback function when OK is pressed
 */
export const showSuccessAlert = (
  title: string, 
  message: string, 
  onOk?: () => void
) => {
  Alert.alert(
    title,
    message,
    [{ text: 'OK', onPress: onOk }],
    { cancelable: false }
  );
};

/**
 * Validate if BLE connection is active
 * 
 * @param bleService BLE service object
 * @param showAlert Whether to show alert if not connected
 * @returns Boolean indicating if connection is valid
 */
export const validateConnection = (
  bleService?: PeripheralServices,
  showAlert: boolean = true
): bleService is PeripheralServices => {
  if (!bleService || !bleService.peripheralId) {
    if (showAlert) {
      showErrorAlert(
        'Not Connected',
        'Please connect to a scale device first'
      );
    }
    return false;
  }
  return true;
};

/**
 * Format weight value for display
 * 
 * @param weight Weight value as number
 * @param unit Weight unit (kg, g, lb, etc)
 * @param decimals Number of decimal places
 * @returns Formatted weight string
 */
export const formatWeight = (
  weight: number,
  unit: string = 'kg',
  decimals: number = 2
): string => {
  return `${weight.toFixed(decimals)} ${unit}`;
};

/**
 * Format time for display
 * 
 * @param date Date object
 * @returns Formatted time string
 */
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Check if platform is iOS
 */
export const isIOS = Platform.OS === 'ios';

/**
 * Check if platform is Android
 */
export const isAndroid = Platform.OS === 'android';

/**
 * Delay execution for specified milliseconds
 * 
 * @param ms Milliseconds to delay
 * @returns Promise that resolves after delay
 */
export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));