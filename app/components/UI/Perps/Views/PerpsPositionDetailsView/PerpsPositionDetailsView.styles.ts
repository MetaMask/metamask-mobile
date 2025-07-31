import { StyleSheet } from 'react-native';

import type { Theme } from '../../../../../util/theme/models';

export const createStyles = ({
  theme,
}: {
  theme: Theme;
  vars: Record<string, never>;
}) => {
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    containerWithPadding: {
      flex: 1,
      backgroundColor: colors.background.default,
      paddingTop: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text.default,
    },
    positionHeader: {
      backgroundColor: colors.background.alternative,
      margin: 16,
      borderRadius: 12,
      padding: 16,
    },
    assetInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    assetName: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.text.default,
      marginRight: 12,
    },
    directionBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    longBadge: {
      backgroundColor: colors.success.muted,
    },
    section: {
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    shortBadge: {
      backgroundColor: colors.error.muted,
    },
    directionText: {
      fontSize: 14,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    longText: {
      color: colors.success.default,
    },
    shortText: {
      color: colors.error.default,
    },
    pnlContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    pnlValue: {
      fontSize: 28,
      fontWeight: '700',
    },
    positivePnl: {
      color: colors.success.default,
    },
    negativePnl: {
      color: colors.error.default,
    },
    pnlPercentage: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: 4,
    },
    detailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: 16,
    },
    detailCard: {
      width: '48%',
      backgroundColor: colors.background.default,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      marginHorizontal: '1%',
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    detailLabel: {
      fontSize: 12,
      color: colors.text.muted,
      marginBottom: 6,
    },
    detailValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
    },
    actionsSection: {
      margin: 16,
    },
    closeSection: {
      backgroundColor: colors.background.alternative,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    closeWarning: {
      backgroundColor: colors.warning.muted,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    warningText: {
      fontSize: 14,
      color: colors.warning.default,
      textAlign: 'center',
      lineHeight: 20,
    },
    buttonContainer: {
      marginTop: 8,
    },
    editButton: {
      marginBottom: 12,
    },
    closeButton: {
      backgroundColor: colors.error.default,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 64,
    },
    loadingText: {
      fontSize: 16,
      color: colors.text.muted,
      marginTop: 16,
    },
    errorContainer: {
      backgroundColor: colors.error.muted,
      borderRadius: 8,
      padding: 16,
      margin: 16,
    },

    headerPlaceholder: {
      width: 32,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay.default,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.background.default,
      borderRadius: 12,
      padding: 20,
      margin: 20,
      maxWidth: 350,
      width: '90%',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.default,
      textAlign: 'center',
      marginBottom: 20,
    },
    inputContainer: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.default,
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border.muted,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text.default,
      backgroundColor: colors.background.alternative,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    modalButton: {
      flex: 1,
    },
  });
};
