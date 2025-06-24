import { StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';
import Device from '../../../util/device';
import { fontStyles } from '../../../styles/common';

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    protectWalletContainer: {
      backgroundColor: colors.background.default,
      paddingTop: 24,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingVertical: 16,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      paddingHorizontal: 40,
    },
    protectWalletIconContainer: {
      alignSelf: 'center',
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.error.muted,
      borderColor: colors.error.default,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    protectWalletIcon: { alignSelf: 'center', color: colors.error.default },
    protectWalletTitle: {
      textAlign: 'center',
      fontSize: 18,
      marginVertical: 8,
      ...fontStyles.bold,
      color: colors.text.default,
    },
    protectWalletContent: {
      textAlign: 'center',
      fontSize: 14,
      marginVertical: 8,
      justifyContent: 'center',
      ...fontStyles.normal,
      color: colors.text.default,
    },
    protectWalletButtonWrapper: { marginVertical: 8 },
  });

export default createStyles;
