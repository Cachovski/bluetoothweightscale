import { useRouter } from 'expo-router';
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
  const router = useRouter();
  
  // Navigate to rmessage when connected
  useEffect(() => {
    if (bleState.isConnected) {
      //console.log("🎯 Navigation: Connected detected, navigating to rmessage");
      router.replace('/rmessage');
    }
  }, [bleState.isConnected, router]);

  // Automatically execute background commands when notifications are ready
  useEffect(() => {
    if (bleState.notificationsReady && bleState.isConnected && bleState.bleService) {
      console.log("🚀 BLE notifications ready, executing background commands...");
      
      // Execute background commands without user seeing them
      const executeBackgroundCommands = async () => {
        try {
          // Wait a bit for notifications to fully stabilize
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Execute get_module_info for WiFi setup and about screens
          await bleState.sendBMCommand("bm_ble/get_module_info");
          console.log("✅ Background command executed: get_module_info");
          
          // You can add more background commands here if needed
          // await bleState.sendBMCommand("bm_ble/other_command");
          
        } catch (error) {
          console.error("❌ Error executing background commands:", error);
        }
      };
      
      executeBackgroundCommands();
    }
  }, [bleState.notificationsReady, bleState.isConnected, bleState.bleService]);
  
  // Ensure disconnection is always handled properly
  useEffect(() => {
    // Define type-safe handler
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // When app comes to foreground, check if we're still connected
      if (nextAppState === 'active' && bleState.isConnected && bleState.bleService) {
        bleState.bleManager.isDeviceConnected(bleState.bleService.peripheralId)
          .then(isConnected => {
            if (!isConnected) {
              // console.log('Device disconnected while app was in background');
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
