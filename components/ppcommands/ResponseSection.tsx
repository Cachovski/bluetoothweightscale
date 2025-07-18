import React from "react";
import {
  StyleSheet,
  Text,
  View
} from "react-native";
import {
  brightnessMinweightTable,
  getCommandTypeFromSubkey,
  interpretBrightnessIntensity,
  interpretResponseValue,
  kgSymbolTable
} from "./utils";

interface ResponseSectionProps {
  sending: boolean;
  ppResponse?: string;
}

export default function ResponseSection({ sending, ppResponse }: ResponseSectionProps) {
  const parseResponse = () => {
    if (!ppResponse) {
      return <Text style={styles.responseText}>🔍 No response yet. Send a command to see detailed response analysis.</Text>;
    }

    if (sending) {
      return <Text style={styles.responseText}>⏳ Sending command...</Text>;
    }

    const responseStr = ppResponse;
    if (responseStr.startsWith("Response: ")) {
      const hexResponse = responseStr.replace("Response: ", "").replace(/\s+/g, "");
      
      // Convert hex string back to bytes for analysis
      const bytes: number[] = [];
      for (let i = 0; i < hexResponse.length; i += 2) {
        const hexByte = hexResponse.substr(i, 2);
        const byte = parseInt(hexByte, 16);
        if (!isNaN(byte)) {
          bytes.push(byte);
        }
      }
      
      // Check for ACK/NACK response
      const ackNackInfo = parseAckNack(bytes);
      
      // Parse PP response data if it's a valid read response
      const ppResponseInfo = parsePPResponseData(bytes);
      
      return (
        <View>
          <Text style={styles.responseLabel}>📩 Raw Response Data:</Text>
          <Text style={styles.responseValue}>- Length: {bytes.length} bytes</Text>
          <Text style={styles.responseValue}>- Hex: {hexResponse}</Text>
          <Text style={styles.responseValue}>- Bytes: [{bytes.join(', ')}]</Text>
          
          {ppResponseInfo && (
            <>
              <Text style={styles.responseLabel}>📊 Response Data Interpretation:</Text>
              <Text style={styles.responseSuccess}>✅ {ppResponseInfo.commandType} Response</Text>
              <Text style={styles.responseValue}>- COM Port: {ppResponseInfo.comPort}</Text>
              <Text style={styles.responseValue}>- Raw Value: 0x{ppResponseInfo.rawValue.toString(16).padStart(2, '0').toUpperCase()} ({ppResponseInfo.rawValue})</Text>
              <Text style={styles.responseSuccess}>- Interpreted Value: {ppResponseInfo.interpretedValue}</Text>
            </>
          )}
          
          {ackNackInfo && (
            <>
              <Text style={styles.responseLabel}>📩 Command Status:</Text>
              <Text style={ackNackInfo.isAck ? styles.responseSuccess : styles.responseError}>
                {ackNackInfo.isAck ? '✅ ACK' : '❌ NACK'} - {ackNackInfo.message}
              </Text>
              <Text style={styles.responseValue}>- Status Code: 0x{ackNackInfo.statusCode.toString(16).padStart(2, '0').toUpperCase()}</Text>
            </>
          )}
          
          {bytes.length > 0 && (
            <>
              <Text style={styles.responseLabel}>📩 Response Analysis:</Text>
              <Text style={styles.responseValue}>- First byte: 0x{bytes[0].toString(16).padStart(2, '0').toUpperCase()} ({bytes[0]})</Text>
              {bytes.length > 1 && (
                <Text style={styles.responseValue}>- Last byte: 0x{bytes[bytes.length - 1].toString(16).padStart(2, '0').toUpperCase()} ({bytes[bytes.length - 1]})</Text>
              )}
              
              <Text style={styles.responseLabel}>📩 ASCII Interpretation:</Text>
              <Text style={styles.responseValue}>
                {bytes.map((byte, index) => {
                  if (byte >= 32 && byte <= 126) {
                    return String.fromCharCode(byte);
                  } else {
                    return `[${byte}]`;
                  }
                }).join('')}
              </Text>
              
              <Text style={styles.responseLabel}>📩 Response Type:</Text>
              {bytes[0] === 0xDD && bytes.length > 1 && bytes[1] === 0xDD ? (
                <Text style={styles.responseSuccess}>✅ Valid PP Response (starts with DDDD)</Text>
              ) : bytes[0] === 0x06 ? (
                <Text style={styles.responseSuccess}>✅ ACK Response (0x06)</Text>
              ) : bytes[0] === 0x15 ? (
                <Text style={styles.responseError}>❌ NAK Response (0x15)</Text>
              ) : (
                <Text style={styles.responseWarning}>⚠️ Unknown Response Pattern</Text>
              )}
            </>
          )}
        </View>
      );
    } else {
      return <Text style={styles.responseText}>{responseStr}</Text>;
    }
  };

  const parsePPResponseData = (bytes: number[]) => {
    // Check if this is a valid PP read response
    // Standard format: DDDD020200010001033D03 (example for baudrate read)
    // Brightness format: DDDD020000040001[checksum]03 (example for brightness duration read)
    if (bytes.length >= 11 && bytes[0] === 0xDD && bytes[1] === 0xDD && bytes[2] === 0x02) {
      
      let subkey: number;
      let comPortByte: number;
      let responseValue: number;
      let commandType: string;
      let comPort: string;
      let interpretedValue: string;
      
      // Check if this is a standard COM command response (pattern: 020200010...)
      if (bytes[3] === 0x02 && bytes[4] === 0x00 && bytes[5] === 0x01 && bytes.length >= 11) {
        subkey = bytes[6];
        comPortByte = bytes[7];
        responseValue = bytes[8];
        comPort = comPortByte === 0x01 ? "COM 1" : comPortByte === 0x02 ? "COM 2" : `Unknown (0x${comPortByte.toString(16).padStart(2, '0').toUpperCase()})`;
        commandType = getCommandTypeFromSubkey(subkey);
        interpretedValue = interpretResponseValue(subkey, responseValue) || `Unknown value (0x${responseValue.toString(16).padStart(2, '0').toUpperCase()})`;
      }
      // Check if this is a brightness command response (pattern: 020000040...)
      else if (bytes[3] === 0x00 && bytes[4] === 0x00 && bytes[5] === 0x04 && bytes.length >= 10) {
        const brightnessSubtype = bytes[6];
        responseValue = bytes[7];
        comPort = "Global"; // Brightness commands don't use COM ports
        
        switch (brightnessSubtype) {
          case 0x00:
            commandType = "Brightness Duration";
            interpretedValue = interpretResponseValue(0x04, responseValue) || `Unknown duration (0x${responseValue.toString(16).padStart(2, '0').toUpperCase()})`;
            break;
          case 0x01:
            commandType = "Brightness Intensity";
            interpretedValue = interpretBrightnessIntensity(responseValue);
            break;
          case 0x02:
            commandType = "Brightness Min Weight";
            interpretedValue = brightnessMinweightTable[responseValue] || `Unknown state (0x${responseValue.toString(16).padStart(2, '0').toUpperCase()})`;
            break;
          case 0x03:
            commandType = "KG Symbol";
            interpretedValue = kgSymbolTable[responseValue] || `Unknown state (0x${responseValue.toString(16).padStart(2, '0').toUpperCase()})`;
            break;
          default:
            commandType = `Unknown Brightness Command (0x${brightnessSubtype.toString(16).padStart(2, '0').toUpperCase()})`;
            interpretedValue = `Unknown value (0x${responseValue.toString(16).padStart(2, '0').toUpperCase()})`;
        }
        subkey = 0x04; // All brightness commands use this subkey
      }
      // Unknown format
      else {
        return null;
      }
      
      return {
        commandType,
        comPort,
        rawValue: responseValue,
        interpretedValue,
        subkey
      };
    }
    
    return null;
  };

  const parseAckNack = (bytes: number[]) => {
    // Check if this is an ACK/NACK response
    // Format examples:
    // - ACK: DDDD020100FD00003A03 (status code 00 = success)
    // - Timeout NACK: DDDD020100FD000A3C03 (status code 0A = timeout)
    // - Invalid Key NACK: DDDD020100FD00023803 (status code 02 = invalid key)
    // Structure: [DD DD 02 01 00 FD 00 STATUS_CODE CHECKSUM 03]
    // Position 5: FD (ACK/NACK indicator)
    // Position 6: 00 (subkey for ACK/NACK, always 00)  
    // Position 7: Status code (00 = ACK, 01-0B = various NACK types)
    if (bytes.length >= 10 && 
        bytes[0] === 0xDD && 
        bytes[1] === 0xDD && 
        bytes[2] === 0x02 &&
        bytes[5] === 0xFD && 
        bytes[6] === 0x00) {
      
      const statusCode = bytes[7];
      
      //console.log(`ACK/NACK parsing: FD at position 5, subkey: 0x${bytes[6].toString(16).padStart(2, '0').toUpperCase()}, status: 0x${statusCode.toString(16).padStart(2, '0').toUpperCase()}`);
      
      if (statusCode === 0x00) {
        return {
          isAck: true,
          statusCode,
          message: "Command executed successfully"
        };
      } else {
        // NACK - determine the error type
        const errorMessage = getNackMessage(statusCode);
        return {
          isAck: false,
          statusCode,
          message: errorMessage
        };
      }
    }
    
    // Check for timeout (shorter message)
    if (bytes.length < 9 && bytes[0] === 0xDD && bytes[1] === 0xDD) {
      return {
        isAck: false,
        statusCode: 0x0B,
        message: "Timeout - No response from device"
      };
    }
    
    return null;
  };

  const getNackMessage = (statusCode: number): string => {
    switch (statusCode) {
      case 0x00:
        return "ACK - Command successful";
      case 0x01:
        return "Generic NACK";
      case 0x02:
        return "Invalid Key NACK";
      case 0x03:
        return "Invalid Subkey NACK";
      case 0x04:
        return "Invalid Size NACK";
      case 0x05:
        return "Invalid CRC NACK";
      case 0x06:
        return "Invalid Data NACK";
      case 0x07:
        return "Busy NACK";
      case 0x08:
        return "Read Only NACK";
      case 0x09:
        return "Write Only NACK";
      case 0x0A:
        return "Timeout NACK";
      case 0x0B:
        return "HW Error NACK";
      default:
        return `Unknown NACK (0x${statusCode.toString(16).padStart(2, '0').toUpperCase()})`;
    }
  };

  return (
    <View style={styles.responseSection}>
      <Text style={styles.responseTitle}>PP Command Response</Text>
      <View style={styles.responseDetails}>
        {parseResponse()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  responseSection: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  responseDetails: {
    marginTop: 8,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 8,
    marginBottom: 4,
  },
  responseValue: {
    fontSize: 13,
    color: "#555",
    marginLeft: 8,
    marginBottom: 2,
    fontFamily: "monospace",
  },
  responseSuccess: {
    fontSize: 13,
    color: "#28a745",
    marginLeft: 8,
    fontWeight: "600",
  },
  responseError: {
    fontSize: 13,
    color: "#dc3545",
    marginLeft: 8,
    fontWeight: "600",
  },
  responseWarning: {
    fontSize: 13,
    color: "#ffc107",
    marginLeft: 8,
    fontWeight: "600",
  },
  responseText: {
    fontSize: 14,
    color: "#333",
  },
});