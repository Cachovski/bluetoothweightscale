import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { CommandAction, HelpModalType } from "./types";

interface CommandModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (action: CommandAction, value?: string) => Promise<void>;
  title: string;
  valueRange: string;
  validationPattern: RegExp;
  helpModalType: HelpModalType;
  onShowHelp: (type: HelpModalType) => void;
  writeOnly?: boolean;
}

export default function CommandModal({
  visible,
  onClose,
  onConfirm,
  title,
  valueRange,
  validationPattern,
  helpModalType,
  onShowHelp,
  writeOnly = false,
}: CommandModalProps) {
  const [action, setAction] = useState<CommandAction>("Write");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const handleClose = () => {
    onClose();
    setValue("");
    setError("");
  };

  const handleConfirm = async () => {
    try {
      if (action === "Write" || writeOnly) {
        if (!value.match(validationPattern)) {
          setError(`Enter a value ${valueRange}`);
          return;
        }
        await onConfirm("Write", value);
      } else {
        await onConfirm(action);
      }
      handleClose();
    } catch (e) {
      setError((e as any).message || "Failed to send");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          {!writeOnly && (
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleButton, action === "Read" && styles.toggleButtonActive]}
                onPress={() => {
                  setAction("Read");
                  setError("");
                }}
              >
                <Text style={[styles.toggleButtonText, action === "Read" && styles.toggleButtonTextActive]}>Read</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, action === "Write" && styles.toggleButtonActive]}
                onPress={() => {
                  setAction("Write");
                  setError("");
                }}
              >
                <Text style={[styles.toggleButtonText, action === "Write" && styles.toggleButtonTextActive]}>Write</Text>
              </TouchableOpacity>
            </View>
          )}
          {(action === "Write" || writeOnly) && (
            <View style={{ width: "100%", marginTop: 16 }}>
              <Text style={{ fontSize: 15, color: "#333", marginBottom: 6 }}>{title} Value ({valueRange}):</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  maxLength={1}
                  value={value}
                  onChangeText={(text: string) => {
                    if (validationPattern.test(text)) {
                      setValue(text);
                      setError("");
                    }
                  }}
                  placeholder={valueRange}
                />
                <TouchableOpacity
                  style={styles.helpButton}
                  onPress={() => onShowHelp(helpModalType)}
                  accessibilityLabel={`Show ${title.toLowerCase()} value table`}
                >
                  <Ionicons name="help-circle-outline" size={22} color="#888" />
                </TouchableOpacity>
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          )}
          <View style={{ flexDirection: "row", marginTop: 24, width: "100%", justifyContent: "space-between" }}>
            <TouchableOpacity
              style={[styles.modalButton, { flex: 1, marginRight: 8 }]}
              onPress={handleConfirm}
            >
              <Text style={styles.modalButtonText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { flex: 1, marginLeft: 8, backgroundColor: "#eee" }]}
              onPress={handleClose}
            >
              <Text style={[styles.modalButtonText, { color: "#333" }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
    gap: 12,
    width: "100%",
  },
  toggleButton: {
    flex: 1,
    backgroundColor: "#eee",
    borderRadius: 8,
    paddingVertical: 10,
    marginHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bbb",
  },
  toggleButtonActive: {
    backgroundColor: "#ff0000",
    borderColor: "#000000",
  },
  toggleButtonText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 16,
  },
  toggleButtonTextActive: {
    color: "#fff",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
    backgroundColor: "#fafafa",
    color: "#333",
    textAlign: "center",
  },
  helpButton: {
    justifyContent: "center",
    alignItems: "center",
    height: 40,
    width: 40,
    marginLeft: 8,
  },
  errorText: {
    color: "#ff3333",
    fontSize: 13,
    marginTop: 2,
    textAlign: "center",
  },
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
    width: "80%",
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
