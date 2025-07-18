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
      case "protocol":
        return [
          { value: "0x00", meaning: "Disable" },
          { value: "0x01", meaning: "Marques" },
          { value: "0x02", meaning: "Printer" },
          { value: "0x03", meaning: "Reserved" },
          { value: "0x04", meaning: "Reserved" },
          { value: "0x05", meaning: "Reserved" },
        ];
      case "brightness-duration":
        return [
          { value: "0x00", meaning: "OFF" },
          { value: "0x01", meaning: "5 seconds" },
          { value: "0x02", meaning: "10 seconds" },
          { value: "0x03", meaning: "15 seconds" },
          { value: "0x04", meaning: "20 seconds" },
          { value: "0x05", meaning: "always ON" },
        ];
      case "brightness-intensity":
        return [
          { value: "0x00", meaning: "0%" },
          { value: "0x64", meaning: "100%" },
          { value: "...", meaning: "percentage (0-100)" },
        ];
      case "brightness-minweight":
        return [
          { value: "0x00", meaning: "OFF" },
          { value: "0x01", meaning: "ON" },
        ];
      case "kg-symbol":
        return [
          { value: "0x00", meaning: "Clear Symbol" },
          { value: "0x01", meaning: "Set Symbol" },
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
      case "protocol":
        return "Protocol Value Table";
      case "brightness-duration":
        return "Brightness Duration Value Table";
      case "brightness-intensity":
        return "Brightness Intensity Value Table";
      case "brightness-minweight":
        return "Brightness Min Weight Value Table";
      case "kg-symbol":
        return "Set/Clear KG Symbol Value Table";
      default:
        return "Value Table";
    }
  };

  const getHeaderRight = () => {
    switch (type) {
      case "baudrate":
        return "Baudrate";
      case "brightness-intensity":
        return "Percentage";
      default:
        return "Meaning";
    }
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
