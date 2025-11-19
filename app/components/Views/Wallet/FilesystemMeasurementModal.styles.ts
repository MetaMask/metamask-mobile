import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    modal: {
      margin: 0,
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
      paddingBottom: 20,
    },
    header: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.default,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.text.alternative,
    },
    content: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.text.default,
      fontWeight: '600',
    },
    loadingSubtext: {
      marginTop: 8,
      fontSize: 14,
      color: colors.text.alternative,
    },
    testSection: {
      marginBottom: 20,
      padding: 16,
      backgroundColor: colors.background.alternative,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    testLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.default,
      marginBottom: 12,
    },
    resultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    resultLabel: {
      fontSize: 14,
      color: colors.text.alternative,
      flex: 1,
    },
    resultValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
    },
    resultValueSmall: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text.default,
      flex: 1,
      textAlign: 'right',
    },
    sizesContainer: {
      marginTop: 8,
    },
    sizeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingLeft: 12,
      paddingVertical: 4,
    },
    controllerName: {
      fontSize: 13,
      color: colors.text.alternative,
      fontFamily: 'monospace',
    },
    sizeValue: {
      fontSize: 13,
      color: colors.text.default,
      fontWeight: '500',
    },
    comparisonSection: {
      backgroundColor: colors.primary.muted,
      borderColor: colors.primary.default,
    },
    comparisonLabel: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.default,
      marginBottom: 12,
    },
    improvementText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.error.default,
      marginBottom: 12,
      textAlign: 'center',
    },
    differenceValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.error.default,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
      color: colors.text.alternative,
    },
    footer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingTop: 16,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
    },
    button: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButton: {
      backgroundColor: colors.primary.default,
    },
    secondaryButton: {
      backgroundColor: colors.background.alternative,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    primaryButtonText: {
      color: colors.primary.inverse,
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButtonText: {
      color: colors.text.default,
      fontSize: 16,
      fontWeight: '600',
    },
  });
};

export default styleSheet;

