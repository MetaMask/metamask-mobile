import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    modal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    container: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '85%',
      paddingBottom: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '600',
    },
    closeButton: {
      width: 32,
      height: 32,
      backgroundColor: colors.background.alternative,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholder: {
      width: 32,
      height: 32,
    },
    infoSection: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 20,
      paddingVertical: 12,
      marginBottom: 16,
    },
    infoText: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.text.alternative,
    },
    tokenList: {
      paddingHorizontal: 20,
    },
    tokenItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    lastTokenItem: {
      borderBottomWidth: 0,
    },
    tokenIcon: {
      marginRight: 12,
    },
    tokenInfo: {
      flex: 1,
    },
    tokenTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tokenSymbol: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
    },
    tokenBalance: {
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    tokenBalanceAmount: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
    },
    tokenTimingRight: {
      fontSize: 12,
      marginTop: 2,
    },
    emptyState: {
      padding: 48,
      alignItems: 'center',
    },
  });
