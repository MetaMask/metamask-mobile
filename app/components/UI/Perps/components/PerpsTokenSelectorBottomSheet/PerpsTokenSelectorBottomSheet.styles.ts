import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      paddingVertical: 8,
      maxHeight: 500,
    },
    tokenItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    tokenItemSelected: {
      backgroundColor: colors.background.section,
    },
    tokenItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    tokenLogo: {
      marginRight: 12,
    },
    tokenInfo: {
      flex: 1,
      marginLeft: 12,
    },
    tokenBalanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 8,
    },
    tokenBalanceFiat: {
      marginLeft: 8,
    },
    emptyContainer: {
      padding: 24,
      alignItems: 'center',
    },
  });
