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
    directionBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      marginRight: 8,
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
    positivePnl: {
      color: colors.success.default,
    },
    negativePnl: {
      color: colors.error.default,
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
