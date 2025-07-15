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
      const hexResponse = responseStr.replace("Response: ", "");
      
      // Convert hex string back to bytes for analysis
      const bytes: number[] = [];
      for (let i = 0; i < hexResponse.length; i += 2) {
        bytes.push(parseInt(hexResponse.substr(i, 2), 16));
      }
      
      return (
        <View>
          <Text style={styles.responseLabel}>📩 Raw Response Data:</Text>
          <Text style={styles.responseValue}>- Length: {bytes.length} bytes</Text>
          <Text style={styles.responseValue}>- Hex: {hexResponse}</Text>
          <Text style={styles.responseValue}>- Bytes: [{bytes.join(', ')}]</Text>
          
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
