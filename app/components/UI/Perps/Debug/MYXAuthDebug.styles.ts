import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    scrollView: {
      flex: 1,
    },
    section: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    sectionTitle: {
      marginBottom: 8,
      fontWeight: 'bold',
    },
    subtitle: {
      marginTop: 4,
      color: colors.text.alternative,
    },
    toggleContainer: {
      flexDirection: 'row',
      marginTop: 8,
      gap: 8,
    },
    toggleButton: {
      flex: 1,
      padding: 10,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: colors.background.alternative,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    toggleActive: {
      backgroundColor: colors.primary.default,
      borderColor: colors.primary.default,
    },
    toggleText: {
      color: colors.text.default,
    },
    toggleTextActive: {
      color: colors.primary.inverse,
      fontWeight: '600',
    },
    button: {
      backgroundColor: colors.primary.default,
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonSecondary: {
      backgroundColor: colors.background.alternative,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    buttonSuccess: {
      backgroundColor: colors.success.default,
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: colors.primary.inverse,
      fontWeight: '600',
    },
    buttonTextSecondary: {
      color: colors.text.default,
    },
    formatSelectorTitle: {
      marginBottom: 8,
      fontWeight: '600',
    },
    formatSelector: {
      gap: 8,
    },
    formatButton: {
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.background.alternative,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    formatButtonSelected: {
      backgroundColor: colors.primary.muted,
      borderColor: colors.primary.default,
    },
    formatButtonText: {
      color: colors.text.default,
      fontWeight: '500',
      marginBottom: 2,
    },
    formatButtonTextSelected: {
      color: colors.primary.default,
      fontWeight: '600',
    },
    formatButtonDesc: {
      color: colors.text.alternative,
      fontSize: 11,
    },
    formatButtonDescSelected: {
      color: colors.primary.default,
    },
    logsSection: {
      padding: 16,
      flex: 1,
    },
    logsTitle: {
      marginBottom: 8,
      fontWeight: '600',
    },
    logsContainer: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 12,
      minHeight: 300,
    },
    logsEmpty: {
      color: colors.text.muted,
      fontStyle: 'italic',
    },
    logEntry: {
      marginBottom: 4,
    },
    logText: {
      fontFamily: 'monospace',
      fontSize: 11,
      lineHeight: 16,
    },
    groupHeader: {
      marginTop: 8,
      fontWeight: '600',
    },
  });
};

export default styleSheet;
