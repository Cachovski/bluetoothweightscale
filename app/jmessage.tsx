import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useBLEContext } from "../contexts/BLEContext";
import { bytesToHex } from "../utils/bleUtils";
import { commonStyles } from "../utils/commonStyles";

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

export default function JMessageScreen() {
  const { jMessageData } = useBLEContext();
  const parsed = parseJMessage(jMessageData);

  return (
    <View style={commonStyles.container}>
      <ScrollView
        style={commonStyles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={commonStyles.title}>J Message Manager</Text>
        {/* Raw J message data removed as requested */}
        <Text style={commonStyles.subtitle}>Internal Count (hex):</Text>
        <View style={styles.dataBox}>
          <Text selectable style={styles.dataTextCentered}>
            {parsed.internalCountHex || "-"}
          </Text>
        </View>
        <Text style={commonStyles.subtitle}>Internal Count (decimal):</Text>
        <View style={styles.dataBox}>
          <Text selectable style={styles.dataTextCentered}>
            {parsed.internalCountDec || "-"}
          </Text>
        </View>
        <Text style={commonStyles.subtitle}>Weight:</Text>
        <View style={styles.dataBox}>
          <Text selectable style={styles.dataTextCentered}>
            {parsed.weight || "-"}
          </Text>
        </View>
        <Text style={commonStyles.subtitle}>Flags:</Text>
        <View style={styles.dataBox}>
          <Text selectable style={styles.dataTextCentered}>
            {parsed.flags !== null
              ? `0x${parsed.flags.toString(16).padStart(2, "0").toUpperCase()}`
              : "-"}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
