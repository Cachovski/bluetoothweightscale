import React from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { colors } from '../utils/commonStyles';

interface CustomButtonProps {
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  variant?: 'primary' | 'secondary' | 'outline';
  title?: string;
  children?: React.ReactNode;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  onPress,
  onPressIn,
  onPressOut,
  onLongPress,
  delayLongPress,
  disabled,
  style,
  textStyle,
  variant = 'primary',
  title,
  children,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        disabled && styles.disabled,
        style,
      ]}
    >
      {children ? (
        children
      ) : (
        <Text style={[styles.text, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primary: {
    backgroundColor: colors?.primary || '#007AFF',
  },
  secondary: {
    backgroundColor: colors?.secondary || '#34C759',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors?.primary || '#007AFF',
  },
  disabled: {
    opacity: 0.6,
    backgroundColor: '#CCCCCC',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

