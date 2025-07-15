// Helper functions for PP Commands

// Calculate 2's complement checksum (uint8)
export function calculateChecksum(data: number[]): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
  }
  sum = sum & 0xff;
  return (~sum + 1) & 0xff;
}

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
  { title: "Display 1", command: "display_cmd_1", category: "Display" },
  { title: "Buzzer 1", command: "buzzer_cmd_1", category: "Buzzer" },
  {
    title: "Special 1",
    command: "special_cmd_1",
    category: "Special Configs",
  },
];
