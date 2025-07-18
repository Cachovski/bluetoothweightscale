import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useBLEContext } from "../contexts/BLEContext";
import { bytesToHex } from "../utils/bleUtils";
import { commonStyles } from "../utils/commonStyles";
import { parseRMessage } from "../utils/sniProtocol";

function parseJMessage(jMessageData: number[]) {
  if (!jMessageData || jMessageData.length < 12) {
    return {
      internalCountHex: "",
      internalCountDec: "",
      flags: null,
      weight: "",
      statusFlags: null,
    };
  }
  // J message format:
  // 0: 0x4A ('J')
  // 1-7: internal count (ASCII digits)
  // 8: flags byte
  // 9-15: weight (ASCII, e.g. 3030302E303030 = '000.000')
  // 16-17: 0D 0A
  const internalCountBytes = jMessageData.slice(1, 8);
  const internalCountHex = bytesToHex(internalCountBytes);
  const internalCountDec = internalCountBytes
    .map((b) => String.fromCharCode(b))
    .join("");
  const flagsByte = jMessageData[8];
  const weightBytes = jMessageData.slice(9, 16);
  const weightStr = weightBytes.map((b) => String.fromCharCode(b)).join("");
  // Use the same status flag parser as P message
  const statusFlags =
    require("../utils/sniProtocol").default?.parseStatusByte &&
    require("../utils/sniProtocol").default.parseStatusByte(flagsByte);
  return {
    internalCountHex,
    internalCountDec,
    flags: flagsByte,
    weight: weightStr,
    statusFlags,
  };
}

function parseTMessage(tMessageData: number[]) {
  if (!tMessageData || tMessageData.length === 0) {
    return {
      rawData: "",
      content: "",
      length: 0,
    };
  }
  
  const rawData = bytesToHex(tMessageData);
  const content = tMessageData.map((b) => String.fromCharCode(b)).join("");
  
  return {
    rawData,
    content,
    length: tMessageData.length,
  };
}

function parsePMessage(pMessageData: number[]) {
  if (!pMessageData || pMessageData.length < 8) {
    return {
      rawData: "",
      weight: "",
      flags: null,
      statusFlags: null,
    };
  }
  
  const rawData = bytesToHex(pMessageData);
  // P message format: P + weight data + flags + CR LF (0D 0A)
  // Example: 503030312e393936010d0a
  // 50 = 'P', 3030312e393936 = weight "001.996", 01 = flags, 0d0a = CR LF
  const weightBytes = pMessageData.slice(1, -3); // Skip 'P' at start and flags + CR LF at end
  const flagsByte = pMessageData[pMessageData.length - 3]; // Third from last byte (before CR LF)
  const weightStr = weightBytes.map((b) => String.fromCharCode(b)).join("");
  
  const statusFlags =
    require("../utils/sniProtocol").default?.parseStatusByte &&
    require("../utils/sniProtocol").default.parseStatusByte(flagsByte);
  
  return {
    rawData,
    weight: weightStr,
    flags: flagsByte,
    statusFlags,
  };
}

function parseRMessageLocal(rMessageData: number[]) {
  if (!rMessageData || rMessageData.length === 0) {
    return {
      rawData: "",
      content: "",
      length: 0,
      parsedData: null,
    };
  }
  
  const rawData = bytesToHex(rMessageData);
  const content = rMessageData.map((b) => String.fromCharCode(b)).join("");
  const parsedData = parseRMessage(rMessageData);
  
  return {
    rawData,
    content,
    length: rMessageData.length,
    parsedData,
  };
}

export default function MessagesScreen() {
  const { jMessageData, tMessageData, pMessageData, rMessageData } = useBLEContext();
  const [selectedTab, setSelectedTab] = useState('J');
  
  const parsedJ = parseJMessage(jMessageData);
  const parsedT = parseTMessage(tMessageData);
  const parsedP = parsePMessage(pMessageData);
  const parsedR = parseRMessageLocal(rMessageData);

  const tabs = [
    { id: 'J', label: 'J Message', data: jMessageData },
    { id: 'T', label: 'T Message', data: tMessageData },
    { id: 'P', label: 'P Message', data: pMessageData },
    { id: 'R', label: 'R Message', data: rMessageData },
  ];

  const renderJMessage = () => (
    <>
      <Text style={commonStyles.subtitle}>Length:</Text>
      <View style={styles.dataBox}>
        <Text selectable style={styles.dataTextCentered}>
          {jMessageData.length} bytes
        </Text>
      </View>
      
      <Text style={commonStyles.subtitle}>Raw Data (hex):</Text>
      <View style={styles.dataBox}>
        <Text selectable style={styles.dataTextCentered}>
          {bytesToHex(jMessageData) || "-"}
        </Text>
      </View>
      
      <Text style={commonStyles.subtitle}>Internal Count (hex):</Text>
      <View style={styles.dataBox}>
        <Text selectable style={styles.dataTextCentered}>
          {parsedJ.internalCountHex || "-"}
        </Text>
      </View>
      
      <Text style={commonStyles.subtitle}>Internal Count (decimal):</Text>
      <View style={styles.dataBox}>
        <Text selectable style={styles.dataTextCentered}>
          {parsedJ.internalCountDec || "-"}
        </Text>
      </View>
      
      <Text style={commonStyles.subtitle}>Weight:</Text>
      <View style={styles.dataBox}>
        <Text selectable style={styles.dataTextCentered}>
          {parsedJ.weight || "-"}
        </Text>
      </View>
      
      <Text style={commonStyles.subtitle}>Flags:</Text>
      <View style={styles.dataBox}>
        <Text selectable style={styles.dataTextCentered}>
          {parsedJ.flags !== null
            ? `0x${parsedJ.flags.toString(16).padStart(2, "0").toUpperCase()} (${parsedJ.flags.toString(2).padStart(8, "0")})`
            : "-"}
        </Text>
      </View>
    </>
  );

  const renderTMessage = () => (
    <>
      <Text style={commonStyles.subtitle}>Length:</Text>
      <View style={styles.dataBox}>
        <Text selectable style={styles.dataTextCentered}>
          {parsedT.length} bytes
        </Text>
      </View>
      
      <Text style={commonStyles.subtitle}>Raw Data (hex):</Text>
      <View style={styles.dataBox}>
        <Text selectable style={styles.dataTextCentered}>
          {parsedT.rawData || "-"}
        </Text>
      </View>
      
      <Text style={commonStyles.subtitle}>Content:</Text>
      <View style={styles.dataBox}>
        <Text selectable style={styles.dataTextCentered}>
          {parsedT.content || "-"}
        </Text>
      </View>
    </>
  );

  const renderPMessage = () => (
    <>
      <Text style={commonStyles.subtitle}>Length:</Text>
      <View style={styles.dataBox}>
        <Text selectable style={styles.dataTextCentered}>
          {pMessageData.length} bytes
        </Text>
      </View>
      
      <Text style={commonStyles.subtitle}>Raw Data (hex):</Text>
      <View style={styles.dataBox}>
        <Text selectable style={styles.dataTextCentered}>
          {parsedP.rawData || "-"}
        </Text>
      </View>
      
      <Text style={commonStyles.subtitle}>Weight:</Text>
      <View style={styles.dataBox}>
        <Text selectable style={styles.dataTextCentered}>
          {parsedP.weight || "-"}
        </Text>
      </View>
      
      <Text style={commonStyles.subtitle}>Flags:</Text>
      <View style={styles.dataBox}>
        <Text selectable style={styles.dataTextCentered}>
          {parsedP.flags !== null
            ? `0x${parsedP.flags.toString(16).padStart(2, "0").toUpperCase()} (${parsedP.flags.toString(2).padStart(8, "0")})`
            : "-"}
        </Text>
      </View>
    </>
  );

  const renderRMessage = () => (
    <>
      <Text style={commonStyles.subtitle}>Length:</Text>
      <View style={styles.dataBox}>
        <Text selectable style={styles.dataTextCentered}>
          {parsedR.length} bytes
        </Text>
      </View>
      
      <Text style={commonStyles.subtitle}>Raw Data (hex):</Text>
      <View style={styles.dataBox}>
        <Text selectable style={styles.dataTextCentered}>
          {parsedR.rawData || "-"}
        </Text>
      </View>
      
      <Text style={commonStyles.subtitle}>Content:</Text>
      <View style={styles.dataBox}>
        <Text selectable style={styles.dataTextCentered}>
          {parsedR.content || "-"}
        </Text>
      </View>
      
      {parsedR.parsedData && (
        <>
          <Text style={commonStyles.subtitle}>Display Weight:</Text>
          <View style={styles.dataBox}>
            <Text selectable style={styles.dataTextCentered}>
              {parsedR.parsedData.success ? parsedR.parsedData.visorDisplay : parsedR.parsedData.error || "-"}
            </Text>
          </View>
          
          {parsedR.parsedData.success && parsedR.parsedData.statusByte !== undefined && (
            <>
              <Text style={commonStyles.subtitle}>Status Flags:</Text>
              <View style={styles.dataBox}>
                <Text selectable style={styles.dataTextCentered}>
                  {`0x${parsedR.parsedData.statusByte.toString(16).padStart(2, "0").toUpperCase()} (${parsedR.parsedData.statusByte.toString(2).padStart(8, "0")})`}
                </Text>
              </View>
            </>
          )}
        </>
      )}
    </>
  );

  const renderContent = () => {
    switch (selectedTab) {
      case 'J':
        return renderJMessage();
      case 'T':
        return renderTMessage();
      case 'P':
        return renderPMessage();
      case 'R':
        return renderRMessage();
      default:
        return null;
    }
  };

  return (
    <View style={commonStyles.container}>
      <Text style={[commonStyles.title, styles.title]}>Messages</Text>

      {/* Tab Buttons */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabButton,
              selectedTab === tab.id && styles.tabButtonActive,
            ]}
            onPress={() => setSelectedTab(tab.id)}
          >
            <Text
              style={[
                styles.tabButtonText,
                selectedTab === tab.id && styles.tabButtonTextActive,
              ]}
            >
              {tab.label}
            </Text>
            {/* Data indicator */}
            <View
              style={[
                styles.dataIndicator,
                (tab.data && tab.data.length > 0) && styles.dataIndicatorActive,
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={commonStyles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
        
        {/* Bottom spacing */}
        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 20,
  },
  // rawBox and rawText removed
  dataBox: {
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dataText: {
    color: "#fff",
    fontFamily: "monospace",
    fontSize: 16,
    letterSpacing: 1,
  },
  dataTextCentered: {
    color: "#fff",
    fontFamily: "monospace",
    fontSize: 16,
    letterSpacing: 1,
    textAlign: "center",
  },
  // Tab styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    position: "relative",
  },
  tabButtonActive: {
    backgroundColor: "#ff0000",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  tabButtonTextActive: {
    color: "#fff",
  },
  dataIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e0e0e0",
  },
  dataIndicatorActive: {
    backgroundColor: "#4CAF50",
  },
});
