// Helper functions for PP Commands
import { FrameType } from "./types";

// Calculate 2's complement checksum (uint8)
export function calculateChecksum(data: number[]): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
  }
  sum = sum & 0xff;
  return (~sum + 1) & 0xff;
}

// Frame subkey mappings - these are correct and consistent for both commands and responses
export const frameSubkeys: { [key in FrameType]: number } = {
  P: 0x05, // P Frame
  T: 0x06, // T Frame
  R: 0x07, // R Frame
  A: 0x08, // A Frame
  Z: 0x09, // Z Frame
  J: 0x0A, // J Frame
};

// Command categories
export const categories = [
  "COM",
  "Metro Configs",
  "Adjust",
  "Display",
  "Buzzer",
  "Special Configs",
];

// Default commands for non-COM categories
export const ppCommands = [
  { title: "Metro 1", command: "metro_cmd_1", category: "Metro Configs" },
  { title: "Adjust 1", command: "adjust_cmd_1", category: "Adjust" },
  {
    title: "Special 1",
    command: "special_cmd_1",
    category: "Special Configs",
  },
];

// Lookup tables for interpreting response values
export const baudrateTable: { [key: number]: string } = {
  0x00: "1200",
  0x01: "2400", 
  0x02: "4800",
  0x03: "9600",
  0x04: "19200",
  0x05: "38400",
  0x06: "57600",
  0x07: "115200",
};

export const databitsTable: { [key: number]: string } = {
  0x00: "8 Bits",
  0x01: "9 Bits",
};

export const parityTable: { [key: number]: string } = {
  0x00: "NONE",
  0x01: "ODD", 
  0x02: "EVEN",
};

export const stopbitsTable: { [key: number]: string } = {
  0x00: "1 Bit",
  0x01: "2 Bits",
};

export const protocolTable: { [key: number]: string } = {
  0x00: "Disable",
  0x01: "Marques",
  0x02: "Printer",
  0x03: "Reserved",
  0x04: "Reserved", 
  0x05: "Reserved",
};

export const brightnessDurationTable: { [key: number]: string } = {
  0x00: "OFF",
  0x01: "5 seconds",
  0x02: "10 seconds",
  0x03: "15 seconds",
  0x04: "20 seconds",
  0x05: "always ON",
};

export const brightnessMinweightTable: { [key: number]: string } = {
  0x00: "OFF",
  0x01: "ON",
};

export const kgSymbolTable: { [key: number]: string } = {
  0x00: "Clear Symbol",
  0x01: "Set Symbol",
};

export const frameEnabledTable: { [key: number]: string } = {
  0x00: "Disabled",
  0x01: "Enabled",
};

// Function to interpret PP response value based on command type and subkey
export function interpretResponseValue(subkey: number, value: number): string | null {
  switch (subkey) {
    case 0x00: // Baudrate
      return baudrateTable[value] || `Unknown baudrate (0x${value.toString(16).padStart(2, '0').toUpperCase()})`;
    case 0x01: // Databits
      return databitsTable[value] || `Unknown databits (0x${value.toString(16).padStart(2, '0').toUpperCase()})`;
    case 0x02: // Parity
      return parityTable[value] || `Unknown parity (0x${value.toString(16).padStart(2, '0').toUpperCase()})`;
    case 0x03: // Stopbits
      return stopbitsTable[value] || `Unknown stopbits (0x${value.toString(16).padStart(2, '0').toUpperCase()})`;
    case 0x04: // Protocol or Brightness Duration (context dependent)
      // For brightness duration, use the brightness table
      return brightnessDurationTable[value] || protocolTable[value] || `Unknown value (0x${value.toString(16).padStart(2, '0').toUpperCase()})`;
    case 0x05: // P Frame
    case 0x06: // T Frame
    case 0x07: // R Frame 
    case 0x08: // A Frame
    case 0x09: // Z Frame
    case 0x0A: // J Frame
      return frameEnabledTable[value] || `Unknown frame state (0x${value.toString(16).padStart(2, '0').toUpperCase()})`;
    default:
      return null;
  }
}

// Function to get command type from subkey for display purposes
export function getCommandTypeFromSubkey(subkey: number): string {
  switch (subkey) {
    case 0x00: return "Baudrate";
    case 0x01: return "Databits";
    case 0x02: return "Parity";
    case 0x03: return "Stopbits";
    case 0x04: return "Protocol";
    case 0x05: return "P Frame";
    case 0x06: return "T Frame";
    case 0x07: return "R Frame";
    case 0x08: return "A Frame";
    case 0x09: return "Z Frame";
    case 0x0A: return "J Frame";
    default: return `Unknown Command (subkey 0x${subkey.toString(16).padStart(2, '0').toUpperCase()})`;
  }
}

// Special handling for brightness intensity (percentage 0-100)
export function interpretBrightnessIntensity(value: number): string {
  return `${value}%`;
}

// Special handling for brightness min weight (4-byte value)
export function interpretBrightnessMinweight(bytes: number[]): string {
  if (bytes.length >= 4) {
    // Combine 4 bytes into a 32-bit value
    const value = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
    return `${value} grams`;
  }
  return "Invalid data";
}

// Test function for ACK/NACK parsing
export function testAckNackParsing() {
  console.log("=== Testing ACK/NACK Parsing ===");
  
  // Test cases based on the format DDDD020100FD00[STATUS][CHECKSUM]03
  const testCases = [
    {
      name: "ACK (Success)",
      hex: "DDDD020100FD00003A03",
      expectedStatus: 0x00,
      expectedIsAck: true
    },
    {
      name: "Timeout NACK", 
      hex: "DDDD020100FD000A3C03",
      expectedStatus: 0x0A,
      expectedIsAck: false
    },
    {
      name: "Invalid Key NACK",
      hex: "DDDD020100FD00023803", 
      expectedStatus: 0x02,
      expectedIsAck: false
    },
    {
      name: "Generic NACK",
      hex: "DDDD020100FD00013703",
      expectedStatus: 0x01,
      expectedIsAck: false
    }
  ];
  
  testCases.forEach(testCase => {
    console.log(`\nTesting ${testCase.name}:`);
    console.log(`Input: ${testCase.hex}`);
    
    // Convert hex to bytes
    const bytes: number[] = [];
    for (let i = 0; i < testCase.hex.length; i += 2) {
      const hexByte = testCase.hex.substr(i, 2);
      const byte = parseInt(hexByte, 16);
      if (!isNaN(byte)) {
        bytes.push(byte);
      }
    }
    
    console.log(`Parsed bytes: [${bytes.join(', ')}]`);
    console.log(`FD at position 5: ${bytes[5] === 0xFD ? '✅' : '❌'}`);
    console.log(`Subkey at position 6: 0x${bytes[6]?.toString(16).padStart(2, '0').toUpperCase()}`);
    console.log(`Status at position 7: 0x${bytes[7]?.toString(16).padStart(2, '0').toUpperCase()}`);
    console.log(`Expected: Status=0x${testCase.expectedStatus.toString(16).padStart(2, '0').toUpperCase()}, IsAck=${testCase.expectedIsAck}`);
  });
  
  console.log("=== End ACK/NACK Test ===");
}
