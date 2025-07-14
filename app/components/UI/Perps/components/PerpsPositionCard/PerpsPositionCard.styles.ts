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
      marginBottom: 16,
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
      marginBottom: 4,
    },
    leverageText: {
      fontSize: 16,
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
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    longText: {
      color: colors.success.default,
    },
    shortText: {
      color: colors.error.default,
    },
    tokenAmount: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.muted,
    },
    positionValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.default,
      textAlign: 'right',
    },
    priceChange: {
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'right',
    },

    // Body styles
    body: {
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
      paddingVertical: 12,
      marginBottom: 16,
    },
    bodyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    bodyItem: {
      flex: 1,
      alignItems: 'flex-start',
    },
    bodyLabel: {
      fontSize: 12,
      color: colors.text.muted,
      marginBottom: 4,
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
