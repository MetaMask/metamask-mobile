import { StyleSheet } from 'react-native';
import Device from '../../../../util/device';
import { Theme } from '@metamask/design-tokens';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    button: {
      flexShrink: 1,
      marginHorizontal: 0,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 60,
    },
    disabledButton: {
      opacity: 0.5,
    },
    buttonIconWrapper: {
      width: 36,
      height: 36,
      borderRadius: 18,
      paddingTop: Device.isAndroid() ? 2 : 4,
      paddingLeft: 1,
      justifyContent: 'center',
      alignContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primary.default,
    },
    buttonIcon: {
      justifyContent: 'center',
      alignContent: 'center',
      textAlign: 'center',
      color: colors.primary.inverse,
    },
    buttonText: {
      marginTop: 8,
      marginHorizontal: 3,
      color: colors.primary.default,
      fontSize: 14,
    },
    receive: {
      right: Device.isIos() ? 1 : 0,
      bottom: 1,
      transform: [{ rotate: '90deg' }],
    },
    swapsIcon: {
      right: Device.isAndroid() ? 1 : 0,
      bottom: Device.isAndroid() ? 1 : 0,
    },
    buyIcon: {
      right: Device.isAndroid() ? 0.5 : 0,
      bottom: Device.isAndroid() ? 1 : 2,
    },
  });
};

export default createStyles;
