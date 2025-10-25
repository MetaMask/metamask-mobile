import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    dropdownButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.colors.background.default,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
    },
    disabledButton: {
      opacity: 0.5,
    },
    selectedTokenContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    selectedTokenIcon: {
      marginRight: 12,
    },
    selectedTokenInfo: {
      flex: 1,
      marginRight: 8,
    },
    selectedTokenSymbol: {
      fontWeight: '600',
      color: theme.colors.text.default,
    },
    selectedChainName: {
      color: theme.colors.text.alternative,
      fontSize: 12,
      marginTop: 2,
    },
    placeholderText: {
      color: theme.colors.text.alternative,
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay.default,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dropdownContainer: {
      backgroundColor: theme.colors.background.default,
      borderRadius: 16,
      margin: 20,
      maxHeight: '70%',
      minHeight: 300,
      width: '90%',
    },
    dropdownHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
    dropdownTitle: {
      color: theme.colors.text.default,
    },
    closeButton: {
      padding: 4,
    },
    tokenList: {
      flex: 1,
    },
    tokenItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
    tokenBadge: {
      marginRight: 12,
    },
    tokenInfo: {
      flex: 1,
      marginRight: 8,
    },
    tokenSymbol: {
      fontWeight: '600',
      color: theme.colors.text.default,
    },
    chainName: {
      color: theme.colors.text.alternative,
      fontSize: 12,
      marginTop: 2,
    },
  });

export default createStyles;
