import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { commonStyles } from '../utils/commonStyles';
import { RMessageStatusFlags } from '../utils/sniProtocol';

interface StatusIndicatorsProps {
  flags: {
    zero?: boolean;
    stable?: boolean;
    net?: boolean;
    tare?: boolean;
    minimum?: boolean;
    fixedTare?: boolean;
    negative?: boolean;
  };
}

// Helper function to create status flags from RMessage interpretation
export function createRMessageStatusFlags(interpretation: RMessageStatusFlags | undefined): any {
  if (!interpretation) return {};
  
  return {
    zero: interpretation.zeroWeight,
    stable: interpretation.stableWeight,
    net: interpretation.netWeight,
    tare: interpretation.tare,
    minimum: interpretation.isMinimum,
    fixedTare: interpretation.isFixedTare,
    negative: interpretation.isNegative
  };
}

export function StatusIndicators({ flags }: StatusIndicatorsProps) {
  // Define all possible status flags with their display labels
  const allFlags = [
    { id: 'zero', label: 'ZERO' },
    { id: 'stable', label: 'STABLE' },
    { id: 'net', label: 'NET' },
    { id: 'tare', label: 'TARE' },
    { id: 'minimum', label: 'MIN' },
    { id: 'fixedTare', label: 'FIX' },
    { id: 'negative', label: 'NEG' },
  ];
  
  return (
    <View style={commonStyles.flagsContainer}>
      {allFlags.map((flag) => {
        const isActive = flags[flag.id as keyof typeof flags] === true;
        
        return (
          <View
            key={flag.id}
            style={[
              commonStyles.flag,
              isActive && commonStyles.flagActive,
            ]}
          >
            <Text
              style={[
                commonStyles.flagText,
                isActive && commonStyles.flagTextActive,
              ]}
            >
              {flag.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// Additional styles specific to StatusIndicators
const styles = StyleSheet.create({
  // You can add any custom styles here if needed beyond commonStyles
  flagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
  },
});