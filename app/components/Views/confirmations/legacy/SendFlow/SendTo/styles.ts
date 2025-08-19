import { StyleSheet } from 'react-native';
import type { ThemeColors } from '@metamask/design-tokens';
import { fontStyles } from '../../../../../../styles/common';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    inputWrapper: {
      flex: 0,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
      paddingHorizontal: 8,
    },
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    myAccountsText: {
      ...fontStyles.normal,
      color: colors.primary.default,
      fontSize: 16,
      alignSelf: 'center',
      marginTop: 30,
      marginBottom: 30,
    },
    myAccountsTouchable: {
      padding: 28,
    },
    nextActionWrapper: {
      flex: 1,
      marginBottom: 16,
    },
    buttonNextWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    buttonNext: {
      flex: 1,
      marginHorizontal: 24,
    },
    addressErrorWrapper: {
      margin: 16,
    },
    footerContainer: {
      justifyContent: 'flex-end',
      marginBottom: 16,
    },
    warningContainer: {
      marginTop: 20,
      marginHorizontal: 24,
    },
    buyEth: {
      color: colors.primary.default,
      textDecorationLine: 'underline',
    },
    confusabeError: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      margin: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.error.default,
      backgroundColor: colors.error.muted,
      borderRadius: 8,
    },
    confusabeWarning: {
      borderColor: colors.warning.default,
      backgroundColor: colors.warning.muted,
    },
    confusableTitle: {
      marginTop: -3,
      color: colors.text.default,
      ...fontStyles.bold,
      fontSize: 14,
    },
    confusableMsg: {
      color: colors.text.default,
      fontSize: 12,
      lineHeight: 16,
      paddingRight: 10,
    },
    warningIcon: {
      marginRight: 8,
    },
    base: {
      flexDirection: 'row',
      paddingVertical: 5,
      paddingHorizontal: 16,
      borderRadius: 24,
      borderWidth: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderColor: colors.border.muted,
    },
    accountSelectorWrapper: {
      height: 40,
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
      flexDirection: 'row',
      width: '100%',
      marginBottom: 16,
    },
    avatarWrapper: {
      marginRight: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  });

export default createStyles;
