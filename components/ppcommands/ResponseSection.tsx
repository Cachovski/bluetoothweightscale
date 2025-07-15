import React from "react";
import {
  StyleSheet,
  Text,
  View
} from "react-native";

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
      
      return (
        <View>
          <Text style={styles.responseLabel}>📩 Raw Response Data:</Text>
          <Text style={styles.responseValue}>- Length: {bytes.length} bytes</Text>
          <Text style={styles.responseValue}>- Hex: {hexResponse}</Text>
          <Text style={styles.responseValue}>- Bytes: [{bytes.join(', ')}]</Text>
          
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

  const parseAckNack = (bytes: number[]) => {
    // Check if this is a write response with ACK/NACK
    // Format: DDDD020300FD0000010043
    // Position 6: FD (ACK/NACK indicator)
    // Position 7: 00 (subkey for ACK/NACK)
    // Position 8: Status code (00 = ACK, other values = NACK types)
    if (bytes.length >= 9 && bytes[0] === 0xDD && bytes[1] === 0xDD && bytes[6] === 0xFD) {
      const subkey = bytes[7];
      const statusCode = bytes[8];
      
      console.log(`ACK/NACK parsing: FD at position 6, subkey: 0x${subkey.toString(16).padStart(2, '0').toUpperCase()}, status: 0x${statusCode.toString(16).padStart(2, '0').toUpperCase()}`);
      
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
      case 0x01:
        return "Generic error";
      case 0x02:
        return "Invalid key";
      case 0x03:
        return "Invalid subkey";
      case 0x04:
        return "Invalid data size";
      case 0x05:
        return "Invalid CRC";
      case 0x06:
        return "Invalid data";
      case 0x07:
        return "Device busy";
      case 0x08:
        return "Read only - Cannot write to this parameter";
      case 0x09:
        return "Write only - Cannot read from this parameter";
      case 0x0A:
        return "Hardware error";
      case 0x0B:
        return "Timeout";
      default:
        return `Unknown error (0x${statusCode.toString(16).padStart(2, '0').toUpperCase()})`;
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