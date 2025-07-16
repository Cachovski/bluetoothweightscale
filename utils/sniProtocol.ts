/**
 * SNI Scale Protocol Utility
 * 
 * Handles parsing of various message format      // cons        // console.log(`🔍 Added decimal point after position ${i+1} (estado: 0x${estado.toString(16)})`); le.log(`🔍 Position ${i+1}: digit='${digit}' (${displayChars[i]}), estado=${estado} (0x${estado.toString(16)}, binary: ${estado.toString(2).padStart(8, '0')})`);  from BM1000 scale:
 * - R Messages (display data)
 * - P Messages (weight data)
 * - T Messages (total weight data)
 */

// R Message Data Interface
export interface RMessageData {
  success: boolean;
  visorDisplay: string;
  isNumericDisplay: boolean;
  statusByte?: number;
  interpretation?: RMessageStatusFlags;
  error?: string;
}

// Status flags from R message status byte
export interface RMessageStatusFlags {
  zeroWeight: boolean;     // Bit 7
  stableWeight: boolean;   // Bit 6
  netWeight: boolean;      // Bit 5
  tare: boolean;           // Bit 4
  staticTare: boolean;     // Bit 3
  total: boolean;          // Bit 2
  countingScale: boolean;  // Bit 1
  // Bit 0 is always 0
}

/**
 * Parses R Message data from BM1000 scale
 * Format: R D6 D5 D4 D3 D2 D1 A6 A5 A4 A3 A2 A1 ST CR LF
 * D1-D6: Display digits (ASCII characters)
 * A1-A6: Estado characters (display format control)
 * ST: Status byte
 * 
 * @param bytes Array of byte values from BLE notification
 * @returns Parsed R message data
 */
export function parseRMessage(bytes: number[]): RMessageData {
  // console.log("🔍 parseRMessage received bytes:", bytes, "Length:", bytes.length);
  
  // Check if we have valid data - R message should be 15 bytes
  if (!bytes || bytes.length < 15) {
    // console.log("❌ Invalid R message length, expected 15, got:", bytes.length);
    return {
      success: false,
      visorDisplay: "",
      isNumericDisplay: false,
      error: "Invalid message length"
    };
  }

  // Check if it's an R message (first byte should be 'R')
  if (bytes[0] !== 0x52) { // 'R' in ASCII
    // console.log("❌ Not an R message, first byte is:", bytes[0], "expected:", 0x52);
    return {
      success: false,
      visorDisplay: "",
      isNumericDisplay: false,
      error: "Not an R message"
    };
  }

  try {
    // Extract display characters (D6-D1) - bytes 1-6
    const displayChars = bytes.slice(1, 7);
    // console.log("🔍 Display chars (D6-D1):", displayChars);
    
    // Extract estado characters (A6-A1) - bytes 7-12
    const estadoChars = bytes.slice(7, 13);
    // console.log("🔍 Estado chars (A6-A1):", estadoChars);
    
    // Extract status byte - byte 13
    const statusByte = bytes[13];
    // console.log("🔍 Status byte:", statusByte, "Binary:", statusByte.toString(2).padStart(8, '0'));
    
    // Build display string by combining digits with estado formatting
    let displayText = "";
    for (let i = 0; i < 6; i++) {
      const digit = String.fromCharCode(displayChars[i]);
      const estado = estadoChars[i];
      
      console.log(`🔍 Position ${i+1}: digit='${digit}' (${displayChars[i]}), estado=${estado} (0x${estado.toString(16)}, binary: ${estado.toString(2).padStart(8, '0')})`);
      
      // Add the digit (even if it's a space or special character)
      displayText += digit;
      
      // Check estado bits for decimal point
      // Based on SNI protocol: bit 4 (0x10) indicates decimal point
      // 0x00h (NUL) = Normal digit
      // 0x10h (DLE) = Normal digit with decimal point  
      // 0x01h (SOH) = Intermittent digit
      // 0x11h (DC1) = Intermittent digit with decimal point
      if (estado & 0x10) {
        displayText += ".";
        console.log(`🔍 Added decimal point after position ${i+1} (estado: 0x${estado.toString(16)})`);
      }
    }
    
    // Trim whitespace but keep the structure
    displayText = displayText.trim();
    // console.log("✅ Final display text:", JSON.stringify(displayText));
    
    // Parse status byte
    const statusFlags = parseStatusByte(statusByte);
    
    // Check if it's numeric or text display
    const isNumeric = /^[\d.\-\s]*$/.test(displayText) && displayText.replace(/[\s\-\.]/g, '').length > 0;
    
    return {
      success: true,
      visorDisplay: displayText,
      isNumericDisplay: isNumeric,
      statusByte: statusByte,
      interpretation: statusFlags
    };
  } catch (error) {
    return {
      success: false,
      visorDisplay: "",
      isNumericDisplay: false,
      error: "Error parsing R message: " + (error instanceof Error ? error.message : String(error))
    };
  }
}

/**
 * Parse status byte from R/P messages
 * 
 * @param statusByte Status byte value
 * @returns Object with status flag booleans
 */
function parseStatusByte(statusByte: number): RMessageStatusFlags {
  return {
    zeroWeight: (statusByte & 0x80) !== 0,      // Bit 7
    stableWeight: (statusByte & 0x40) !== 0,    // Bit 6
    netWeight: (statusByte & 0x20) !== 0,       // Bit 5
    tare: (statusByte & 0x10) !== 0,            // Bit 4
    staticTare: (statusByte & 0x08) !== 0,      // Bit 3
    total: (statusByte & 0x04) !== 0,           // Bit 2
    countingScale: (statusByte & 0x02) !== 0,   // Bit 1
    // Bit 0 is always 0
  };
}

/**
 * Parses T message (total weight)
 * Format similar to P message but starts with 'T'
 * 
 * @param bytes Array of byte values from BLE notification
 * @returns Total weight as string
 */
export function parseTMessage(bytes: number[]): string {
  // Check if it's a T message
  if (!bytes || bytes.length < 3 || bytes[0] !== 0x54) { // 0x54 is 'T' in ASCII
    return "";
  }
  
  try {
    // Extract weight portion similar to parseRMessage
    const displayBytes = bytes.slice(1, bytes.length - 1);
    const displayText = String.fromCharCode(...displayBytes).trim();
    return displayText;
  } catch (error) {
    console.error("Error parsing T message:", error);
    return "";
  }
}

/**
 * Create status flags object from R message interpretation
 * 
 * @param interpretation Parsed status flags
 * @returns Status flags with proper naming
 */
export function createRMessageStatusFlags(interpretation: RMessageStatusFlags | undefined): any {
  if (!interpretation) return {};
  
  return {
    zero: interpretation.zeroWeight,
    stable: interpretation.stableWeight,
    net: interpretation.netWeight,
    tare: interpretation.tare,
    staticTare: interpretation.staticTare,
    total: interpretation.total,
    countingScale: interpretation.countingScale
  };
}