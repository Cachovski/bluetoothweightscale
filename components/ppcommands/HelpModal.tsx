import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { HelpModalType } from "./types";

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
  type: HelpModalType;
}

export default function HelpModal({ visible, onClose, type }: HelpModalProps) {
  const getTableData = () => {
    switch (type) {
      case "baudrate":
        return [
          { value: "0x00", meaning: "1200" },
          { value: "0x01", meaning: "2400" },
          { value: "0x02", meaning: "4800" },
          { value: "0x03", meaning: "9600" },
          { value: "0x04", meaning: "19200" },
          { value: "0x05", meaning: "38400" },
          { value: "0x06", meaning: "57600" },
          { value: "0x07", meaning: "115200" },
        ];
      case "databits":
        return [
          { value: "0x00", meaning: "8 Bits" },
          { value: "0x01", meaning: "9 Bits" },
        ];
      case "parity":
        return [
          { value: "0x00", meaning: "NONE" },
          { value: "0x01", meaning: "ODD" },
          { value: "0x02", meaning: "EVEN" },
        ];
      case "stopbits":
        return [
          { value: "0x00", meaning: "1 Bit" },
          { value: "0x01", meaning: "2 Bits" },
        ];
      default:
        return [];
    }
  };

  const getTitle = () => {
    switch (type) {
      case "baudrate":
        return "Baudrate Value Table";
      case "databits":
        return "Databits Value Table";
      case "parity":
        return "Parity Value Table";
      case "stopbits":
        return "Stopbits Value Table";
      default:
        return "Value Table";
    }
  };

  const getHeaderRight = () => {
    return type === "baudrate" ? "Baudrate" : "Meaning";
  };

  const tableData = getTableData();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { width: 320 }]}> 
          <Text style={styles.modalTitle}>{getTitle()}</Text>
          <View style={{ width: "100%", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontWeight: "bold", color: "#333" }}>Value</Text>
              <Text style={{ fontWeight: "bold", color: "#333" }}>{getHeaderRight()}</Text>
            </View>
            <View style={{ borderBottomWidth: 1, borderColor: "#eee", marginBottom: 6 }} />
            {tableData.map((row) => (
              <View key={row.value} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                <Text style={{ color: "#333" }}>{row.value}</Text>
                <Text style={{ color: "#333" }}>{row.meaning}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: "#eee" }]}
            onPress={onClose}
          >
            <Text style={[styles.modalButtonText, { color: "#333" }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: 280,
    alignItems: "center",
    elevation: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 18,
    color: "#333",
  },
  modalButton: {
    backgroundColor: "#ff0000",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginVertical: 6,
    alignItems: "center",
    width: "100%",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
