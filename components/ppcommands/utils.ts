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

// Frame subkey mappings based on protocol documentation
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
