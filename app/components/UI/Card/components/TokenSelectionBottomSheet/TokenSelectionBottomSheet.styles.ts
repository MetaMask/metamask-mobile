import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    container: {
      backgroundColor: theme.colors.background.default,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '70%',
      minHeight: '60%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
    closeButton: {
      padding: 8,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: theme.colors.text.default,
      fontWeight: '600',
    },
    headerSpacer: {
      width: 40,
    },
    tokenList: {
      flex: 1,
      paddingHorizontal: 16,
    },
    tokenListContent: {
      flexGrow: 1,
    },
    tokenItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
    selectedTokenItem: {
      backgroundColor: theme.colors.primary.muted,
      borderRadius: 8,
      marginVertical: 4,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary.default,
    },
    tokenBadge: {
      marginRight: 12,
    },
    tokenInfo: {
      flex: 1,
      marginRight: 12,
    },
    tokenSymbol: {
      fontWeight: '600',
      color: theme.colors.text.default,
      fontSize: 16,
      marginBottom: 2,
    },
    tokenName: {
      color: theme.colors.text.alternative,
      marginBottom: 2,
    },
    chainName: {
      color: theme.colors.text.alternative,
      fontSize: 12,
    },
    tokenStatus: {
      alignItems: 'flex-end',
    },
    statusText: {
      color: theme.colors.text.alternative,
      marginBottom: 2,
      fontSize: 12,
    },
    balanceText: {
      color: theme.colors.text.default,
      fontSize: 14,
      fontWeight: '600',
    },
    emptyList: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      color: theme.colors.text.alternative,
      textAlign: 'center',
    },
  });

export default createStyles;
