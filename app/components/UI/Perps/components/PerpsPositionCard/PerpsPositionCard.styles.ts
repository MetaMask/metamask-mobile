import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.section,
      borderRadius: 12,
      padding: 16,
      marginVertical: 6,
      marginHorizontal: 16,
    },

    // Header styles
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    headerLeft: {
      flex: 1,
      alignItems: 'flex-start',
    },
    headerRight: {
      flex: 1,
      alignItems: 'flex-end',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    leverageText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.default,
      marginRight: 8,
    },
    directionBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    longBadge: {
      backgroundColor: colors.success.muted,
    },
    shortBadge: {
      backgroundColor: colors.error.muted,
    },
    directionText: {
      fontSize: 14,
      fontWeight: '600',
    },
    longText: {
      color: colors.success.default,
    },
    shortText: {
      color: colors.error.default,
    },
    tokenAmount: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.muted,
    },
    positionValue: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.default,
      textAlign: 'right',
    },
    positionValuePositive: {
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'right',
      color: colors.success.default,
    },
    positionValueNegative: {
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'right',
      color: colors.error.default,
    },
    priceChange: {
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'right',
    },

    // Body styles
    body: {
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      paddingVertical: 8,
      marginBottom: 8,
    },
    bodyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    bodyItem: {
      flex: 1,
      alignItems: 'flex-start',
    },
    bodyLabel: {
      fontSize: 12,
      color: colors.text.muted,
      textAlign: 'left',
    },
    bodyValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.default,
      textAlign: 'left',
    },

    // Footer styles
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    footerButton: {
      flex: 1,
    },

    // PnL color styles (reused)
    positivePnl: {
      color: colors.success.default,
    },
    negativePnl: {
      color: colors.error.default,
    },

    // Legacy styles (keeping for backward compatibility, can be removed later)
    assetInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    assetName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.default,
      marginRight: 8,
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
    pnlValue: {
      fontSize: 14,
      fontWeight: '600',
    },
    leverageContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
    },
    leverageInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    leverageItem: {
      alignItems: 'center',
    },
    leverageLabel: {
      fontSize: 11,
      color: colors.text.muted,
    },
    leverageValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.default,
    },
  });
