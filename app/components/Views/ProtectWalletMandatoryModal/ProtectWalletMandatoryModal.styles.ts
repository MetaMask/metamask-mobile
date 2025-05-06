import { StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    protectWalletContainer: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      alignItems: 'center',
    },
    protectWalletIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.warning.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    protectWalletIcon: {
      color: colors.background.default,
    },
    protectWalletTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text.default,
      marginBottom: 16,
      textAlign: 'center',
    },
    protectWalletContent: {
      fontSize: 16,
      color: colors.text.alternative,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 24,
    },
    protectWalletButtonWrapper: {
      width: '100%',
    },
  });

export default createStyles;
