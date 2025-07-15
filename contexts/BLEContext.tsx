import React, { createContext, ReactNode, useContext, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useBLE } from '../hooks/useBLE';

// Create the BLE context with the type from useBLE hook
const BLEContext = createContext<ReturnType<typeof useBLE> | undefined>(undefined);

// BLE Provider component
interface BLEProviderProps {
  children: ReactNode;
}

export const BLEProvider: React.FC<BLEProviderProps> = ({ children }) => {
  // Use the BLE hook to get all the functionality
  const bleState = useBLE();
  
  // Ensure disconnection is always handled properly
  useEffect(() => {
    // Define type-safe handler
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // When app comes to foreground, check if we're still connected
      if (nextAppState === 'active' && bleState.isConnected && bleState.bleService) {
        bleState.bleManager.isDeviceConnected(bleState.bleService.peripheralId)
          .then(isConnected => {
            if (!isConnected) {
              console.log('Device disconnected while app was in background');
              bleState.setIsConnected(false);
            }
          })
          .catch(() => {
            // Error checking connection status, assume disconnected
            bleState.setIsConnected(false);
          });
      }
    };
    
    // Add app state change listener - using correct modern API
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Return proper cleanup function
    return () => {
      // This is the correct way to remove the listener in newer React Native
      subscription.remove();
    };
  }, [bleState]);
  
  // Simply provide the complete state from the hook
  return (
    <BLEContext.Provider value={bleState}>
      {children}
    </BLEContext.Provider>
  );
};

// Custom hook to use the BLE context
export const useBLEContext = () => {
  const context = useContext(BLEContext);
  
  if (context === undefined) {
    throw new Error('useBLEContext must be used within a BLEProvider');
  }
  
  return context;
};
