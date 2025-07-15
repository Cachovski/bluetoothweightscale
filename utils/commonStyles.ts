import { Platform, StyleSheet } from 'react-native';

// Color scheme
export const colors = {
  primary: '#007AFF',
  primaryDark: '#0062CC',
  secondary: '#5856D6',
  success: '#4CAF50',
  danger: '#FF3B30',
  warning: '#FFCC00',
  info: '#5AC8FA',
  light: '#F9F9F9',
  dark: '#1D1D1D',
  gray: '#8E8E93',
  lightGray: '#C7C7CC',
  
  // Background colors
  background: '#F5F5F5',
  card: '#FFFFFF',
  visorBackground: '#E0E0E0',
  
  // Text colors
  textPrimary: '#333333',
  textSecondary: '#666666',
  textDisabled: '#999999',
  textInverse: '#FFFFFF',
  
  // Visor display colors
  visorText: '#333333',
  visorTextAlt: '#007AFF',
  visorError: '#FF3B30',
};

// Typography
export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  huge: 32,
  massive: 36,
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

// Border radius
export const borderRadius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 999,
};

// Define shadow styles directly as objects instead of using a shadows object
const shadowSmall = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  android: {
    elevation: 2,
  },
});

const shadowMedium = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 4,
  },
  android: {
    elevation: 4,
  },
});

const shadowLarge = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  android: {
    elevation: 8,
  },
});

// Common styles for reuse across components
export const commonStyles = StyleSheet.create({
  // Containers
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  contentContainer: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  
  // Headers and text
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    paddingTop: spacing.lg,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  heading: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  text: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: fontSize.md * 1.5,
  },
  
  // Cards and panels - FIX: Use shadowSmall directly instead of ...shadows.small
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
    ...shadowSmall,
  },
  
  // Form elements
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  
  // Buttons
  buttonPrimary: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: "#ff0000",
    fontWeight: '600',
    fontSize: fontSize.md,
  },
  buttonTextSecondary: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: fontSize.md,
  },
  
  // Visor display - FIX: Use shadowMedium directly
  visorContainer: {
    backgroundColor: colors.visorBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    minHeight: 150,
    ...shadowMedium,
  },
  visorScreen: {
    width: '100%',
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visorDisplay: {
    fontSize: fontSize.massive,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  visorDisplayText: {
    fontSize: fontSize.huge,
    letterSpacing: 1,
  },
  
  // Status indicators
  flagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  flag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.xs,
    marginVertical: spacing.xs,
  },
  flagActive: {
    backgroundColor: colors.success,
  },
  flagText: {
    fontSize: fontSize.xs,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  flagTextActive: {
    color: colors.textInverse,
  },
  
  // Error states
  errorContainer: {
    backgroundColor: colors.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  
  // Utility classes
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Waiting states
  waitingContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  waitingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});

export default commonStyles;