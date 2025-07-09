import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      borderRadius: 12,
      padding: 16,
      marginVertical: 6,
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    orderInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    orderId: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
      marginRight: 8,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      marginRight: 8,
    },
    successBadge: {
      backgroundColor: colors.success.muted,
    },
    failedBadge: {
      backgroundColor: colors.error.muted,
    },
    pendingBadge: {
      backgroundColor: colors.warning.muted,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    successText: {
      color: colors.success.default,
    },
    failedText: {
      color: colors.error.default,
    },
    pendingText: {
      color: colors.warning.default,
    },
    actionsContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    detailsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    detailColumn: {
      flex: 1,
    },
    detailLabel: {
      fontSize: 12,
      color: colors.text.muted,
      marginBottom: 4,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.default,
    },
    errorContainer: {
      marginTop: 8,
      padding: 8,
      backgroundColor: colors.error.muted,
      borderRadius: 8,
    },
    errorText: {
      fontSize: 12,
      color: colors.error.default,
      fontStyle: 'italic',
    },
    timestampContainer: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
    },
    timestampText: {
      fontSize: 11,
      color: colors.text.muted,
    },
  });
