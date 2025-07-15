import React, { useEffect, useRef, useState } from "react";
import {
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { CustomButton } from "../components/CustomButton";
import {
    createRMessageStatusFlags,
    StatusIndicators,
} from "../components/StatusIndicators";
import { useBLEContext } from "../contexts/BLEContext";
import {
    borderRadius,
    colors,
    commonStyles,
    spacing,
} from "../utils/commonStyles";
import { parseRMessage, RMessageData } from "../utils/sniProtocol";
import { showErrorAlert, validateConnection } from "../utils/uiHelpers";

export default function RMessage() {
  const { bleService, isConnected, rMessageData, tMessageData, sendTCommand } =
    useBLEContext();
  const [localRMessage, setLocalRMessage] = useState<number[]>([]);
  const [localTMessage, setLocalTMessage] = useState<number[]>([]);

  // Update when R message data changes
  useEffect(() => {
    if (rMessageData && rMessageData.length > 0) {
      setLocalRMessage(rMessageData);
    }
  }, [rMessageData]);

  // Update when T message data changes
  useEffect(() => {
    if (tMessageData && tMessageData.length > 0) {
      setLocalTMessage(tMessageData);
    }
  }, [tMessageData]);

  // Simple sequential combination states
  const [combinationMode, setCombinationMode] = useState(false);
  const [combinationExecuted, setCombinationExecuted] = useState(false);
  const [longPressExecuted, setLongPressExecuted] = useState(false);
  const combinationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const buttonConfigs = [
    {
      id: "esc",
      title: "ESC",
      singleCommand: "<T10!>",
      longCommand: "<T10&>",
      combinationCode: "1",
      image: require("../assets/images/Group 19529.png"),
    },
    {
      id: "zero",
      title: "ZERO",
      singleCommand: "<T20!>",
      longCommand: "<T20&>",
      combinationCode: "2",
      image: require("../assets/images/Group 19530.png"),
    },
    {
      id: "tare",
      title: "TARE",
      singleCommand: "<T30!>",
      longCommand: "<T30&>",
      combinationCode: "3",
      image: require("../assets/images/Group 19531.png"),
    },
    {
      id: "fix",
      title: "FIX",
      singleCommand: "<T40!>",
      longCommand: "<T40&>",
      combinationCode: "4",
      image: require("../assets/images/Group 19532.png"),
    },
    {
      id: "print",
      title: "PRINT",
      singleCommand: "<T50!>",
      longCommand: "<T50&>",
      combinationCode: "5",
      image: require("../assets/images/Group 19533.png"),
    },
    {
      id: "total",
      title: "TOTAL",
      singleCommand: "<T60!>",
      longCommand: "<T60&>",
      combinationCode: "6",
      image: require("../assets/images/Group 19534.png"),
    },
  ];

  const handleButtonPressIn = (buttonId: string) => {
    // If we're in combination mode and any button other than ESC is pressed,
    // immediately cancel the ESC timeout to prevent it from executing
    if (combinationMode && buttonId !== "esc") {
      if (combinationTimeoutRef.current) {
        clearTimeout(combinationTimeoutRef.current);
        combinationTimeoutRef.current = null;
      }
    }
  };

  const handleButtonCombination = (
    primaryButton: string,
    secondaryButton: string,
    isLongPress = false
  ) => {
    const primaryConfig = buttonConfigs.find((btn) => btn.id === primaryButton);
    const secondaryConfig = buttonConfigs.find(
      (btn) => btn.id === secondaryButton
    );

    if (primaryConfig && secondaryConfig) {
      const command = `<T1${secondaryConfig.combinationCode}${
        isLongPress ? "&" : "!"
      }>`;
      // console.debug(
      `🎯 ${
        isLongPress ? "long press " : ""
      }combination: ${primaryButton} + ${secondaryButton}`;
      // );
      sendCommand(command);
    }
  };

  const resetCombinationState = () => {
    setCombinationMode(false);
    setCombinationExecuted(false);
    setLongPressExecuted(false);
    if (combinationTimeoutRef.current) {
      clearTimeout(combinationTimeoutRef.current);
      combinationTimeoutRef.current = null;
    }
  };

  const handleButtonPressOut = (buttonId: string) => {
    const config = buttonConfigs.find((btn) => btn.id === buttonId);
    if (!config) return;

    // Skip if long press was already executed for THIS button
    if (longPressExecuted) {
      console.log(
        `🔄 Skipping pressOut for ${buttonId} because long press was executed`
      );
      resetCombinationState(); // Always reset on pressOut
      return;
    }

    // Skip if a combination was already executed (for either button)
    if (combinationExecuted) {
      console.log(
        `🔄 Skipping pressOut for ${buttonId} because combination was executed`
      );
      resetCombinationState(); // Always reset on pressOut
      return;
    }

    if (buttonId === "esc") {
      // ESC starts combination mode
      setCombinationMode(true);

      // Give user 1 second to press second button
      combinationTimeoutRef.current = setTimeout(() => {
        if (!combinationExecuted && !longPressExecuted) {
          console.log(`⏰ Combination timeout - executing single ESC`);
          sendCommand(config.singleCommand);
        }
        resetCombinationState();
      }, 1000);
    } else if (combinationMode && !combinationExecuted) {
      // Second button pressed while in combination mode
      setCombinationExecuted(true);
      handleButtonCombination("esc", buttonId, false);
      resetCombinationState(); // Always reset on pressOut
    } else if (!combinationMode && !combinationExecuted) {
      // Normal single button press
      console.log(`🔘 Normal button press: ${buttonId}`);
      sendCommand(config.singleCommand);
      resetCombinationState(); // Always reset on pressOut
    }
  };

  const handleButtonLongPress = (buttonId: string) => {
    console.log(`🔄 Long press detected for: ${buttonId}`);

    // Mark that long press was executed
    setLongPressExecuted(true);

    const config = buttonConfigs.find((btn) => btn.id === buttonId);
    if (!config) return;

    if (buttonId === "esc") {
      // ESC long press - cancel any pending combination and execute immediately
      console.log(`🔄 ESC long press - executing ${config.longCommand}`);
      resetCombinationState();
      sendCommand(config.longCommand);
    } else if (combinationMode && !combinationExecuted) {
      // Long press combination - clear the timeout to prevent ESC short press
      console.log(`🔄 Long press combination: ESC + ${buttonId}`);
      if (combinationTimeoutRef.current) {
        clearTimeout(combinationTimeoutRef.current);
        combinationTimeoutRef.current = null;
      }
      setCombinationExecuted(true);
      handleButtonCombination("esc", buttonId, true);
      // Don't reset state here - let pressOut handle it
    } else if (!combinationMode) {
      // Normal long press
      console.log(`🔄 Normal long press - executing ${config.longCommand}`);
      sendCommand(config.longCommand);
    }
  };

  const sendCommand = async (command: string) => {
    // Add stack trace to see what's calling this function repeatedly
    console.log(`🔧 sendCommand called with: ${command}`);
    console.log(`🔧 Call stack:`, new Error().stack?.split("\n").slice(0, 5));

    // Check if we're actually connected before attempting to send
    if (!isConnected || !bleService?.peripheralId) {
      console.log(`🚫 Not connected, skipping command: ${command}`);
      return;
    }

    if (!validateConnection(bleService)) {
      return;
    }

    try {
      console.log(`🔧 Actually sending command ${command}`);
      await sendTCommand(command);
      console.log(`✅ Command sent: ${command}`);
    } catch (error) {
      console.error(`❌ Command failed: ${command}`, error);
      // Don't show alert for disconnection errors to avoid spam
      if (!String(error).includes("disconnected")) {
        showErrorAlert("Command Failed", String(error));
      }
    }
  };

  // Add function to parse T messages
  const parseTMessage = (bytes: number[]): string => {
    // console.log("🔍 T Message raw bytes:", bytes, "Length:", bytes.length);
    if (!bytes || bytes.length < 2) {
      console.log("❌ T Message too short");
      return "";
    }

    if (bytes[0] !== 0x54) {
      // 0x54 is 'T' in ASCII
      console.log(
        "❌ T Message validation failed - first byte is not 'T', got:",
        bytes[0]
      );
      return "";
    }

    try {
      // T message format should be similar to R message
      // For now, let's just extract everything after 'T' until CR LF
      let endIndex = bytes.length - 1;

      // Look for CR (0x0D) or LF (0x0A) to find the end
      for (let i = 1; i < bytes.length; i++) {
        if (bytes[i] === 0x0d || bytes[i] === 0x0a) {
          endIndex = i;
          break;
        }
      }

      const displayBytes = bytes.slice(1, endIndex);
      // console.log("🔍 T Message display bytes:", displayBytes);
      const displayText = String.fromCharCode(...displayBytes).trim();
      console.log("✅ T Message parsed:", JSON.stringify(displayText));
      return displayText;
    } catch (error) {
      console.error("Error parsing T message:", error);
      return "";
    }
  };

  const parseRMessageLocal = (bytes: number[]): RMessageData => {
    // console.log("🔍 R Message raw bytes:", bytes);
    const result = parseRMessage(bytes);
    console.log("✅ R Message parsed result:", result);
    return result;
  };

  const parsedData = parseRMessageLocal(localRMessage);
  const tMessageDisplay = parseTMessage(localTMessage);

  return (
    <View style={commonStyles.container}>
      <ScrollView
        style={commonStyles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={commonStyles.title}>Scale Visor Display</Text>
        <Text style={commonStyles.subtitle}>Real-time R Message (DD03)</Text>

        {/* Main Visor Display */}
        {localRMessage.length > 0 ? (
          !parsedData.success ? (
            <View style={commonStyles.errorContainer}>
              <Text style={commonStyles.errorTitle}>Parse Error</Text>
              <Text style={commonStyles.errorText}>{parsedData.error}</Text>
            </View>
          ) : (
            <View style={commonStyles.visorContainer}>
              {/* T Message Display (if available) */}
              {tMessageDisplay && (
                <View style={styles.tMessageRow}>
                  <Text style={styles.tMessageText}>T: {tMessageDisplay}</Text>
                </View>
              )}

              <View style={commonStyles.visorScreen}>
                {/* Debug info */}
                <Text
                  style={[
                    commonStyles.visorDisplay,
                    !parsedData.isNumericDisplay &&
                      commonStyles.visorDisplayText,
                  ]}
                >
                  {parsedData.visorDisplay || "------"}
                </Text>
              </View>

              <StatusIndicators
                flags={createRMessageStatusFlags(parsedData.interpretation)}
              />
            </View>
          )
        ) : (
          <View style={commonStyles.visorContainer}>
            <View style={commonStyles.visorScreen}>
              <Text style={commonStyles.visorDisplay}>------</Text>
            </View>
            <View style={styles.waitingContainer}>
              <Text style={commonStyles.waitingText}>
                Waiting for R message data...
              </Text>
            </View>
          </View>
        )}

        {/* Fixed height container for combination indicator to prevent displacement */}
        <View style={styles.indicatorContainer}>
          {combinationMode && (
            <View style={styles.combinationIndicator}>
              <Text style={styles.combinationText}>
                🔑 Combination Mode Active
              </Text>
            </View>
          )}
        </View>

        {/* Scalable button container with 2 rows of 3 buttons */}
        <View style={styles.ButtonsOuterContainer}>
          {/* Top row - first 3 buttons */}
          <View style={styles.ButtonsContainer}>
            {buttonConfigs.slice(0, 3).map((config) => (
              <View key={config.id} style={styles.ButtonContainer}>
                <CustomButton
                  variant="primary"
                  style={StyleSheet.flatten([
                    styles.Button,
                    config.id === "esc" &&
                      combinationMode &&
                      styles.ButtonActive,
                  ])}
                  onPressIn={() => handleButtonPressIn(config.id)}
                  onPressOut={() => handleButtonPressOut(config.id)}
                  onLongPress={() => handleButtonLongPress(config.id)}
                  delayLongPress={2000}
                  disabled={!isConnected}
                >
                  {config.image ? (
                    <Image
                      source={config.image}
                      style={{ width: 60, height: 60, resizeMode: "contain" }}
                    />
                  ) : null}
                </CustomButton>
              </View>
            ))}
          </View>

          {/* Bottom row - last 3 buttons */}
          <View style={styles.ButtonsContainer}>
            {buttonConfigs.slice(3, 6).map((config) => (
              <View key={config.id} style={styles.ButtonContainer}>
                <CustomButton
                  variant="primary"
                  style={StyleSheet.flatten([
                    styles.Button,
                    config.id === "esc" &&
                      combinationMode &&
                      styles.ButtonActive,
                  ])}
                  onPressIn={() => handleButtonPressIn(config.id)}
                  onPressOut={() => handleButtonPressOut(config.id)}
                  onLongPress={() => handleButtonLongPress(config.id)}
                  delayLongPress={2000}
                  disabled={!isConnected}
                >
                  {config.image ? (
                    <Image
                      source={config.image}
                      style={{ width: 60, height: 60, resizeMode: "contain" }}
                    />
                  ) : null}
                </CustomButton>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Custom styles specific to this component
  displayTypeIndicator: {
    fontSize: 10,
    color: colors.visorTextAlt,
    textAlign: "center",
    marginTop: spacing.xs,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  waitingContainer: {
    marginTop: spacing.md,
  },
  ButtonContainer: {
    alignItems: "center",
    marginVertical: spacing.sm,
    marginHorizontal: spacing.sm,
    flex: 1, // Let each button take equal space
    maxWidth: 120,
  },
  Button: {
    width: "100%", // Make button fill container width
    height: 80, // Increased from 60 to 80
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xs, // Add horizontal padding
    paddingVertical: spacing.sm, // Add vertical padding
    backgroundColor: "#323E48",
  },
  ButtonsOuterContainer: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center", // Center outer container
    width: "100%",
  },
  ButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center", // Center the buttons
    marginBottom: spacing.md,
    width: "100%", // Take full width
    maxWidth: 400, // Limit maximum width on larger screens
  },
  // Fixed height container to prevent button displacement
  indicatorContainer: {
    height: 50, // Fixed height
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.md,
  },
  combinationIndicator: {
    backgroundColor: "#3a4853ff",
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  combinationText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: "bold",
  },
  ButtonActive: {
    backgroundColor: "#3a4853ff",
    transform: [{ scale: 1.05 }],
  },
  // T message styles
  tMessageRow: {
    backgroundColor: "rgba(0,0,0,0.1)",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  tMessageText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 14,
    fontWeight: "bold",
    color: colors.visorText,
    letterSpacing: 1,
  },
});
