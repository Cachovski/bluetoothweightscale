import { Device } from "react-native-ble-plx";

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
  characteristics: any[];
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

// Command response type
export type CommandResponse = {
  command: string;
  response: string;
  timestamp: Date;
};
