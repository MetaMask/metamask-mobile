import type { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { typography } = theme;
  return StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    badgeWrapper: {
      alignSelf: 'center',
    },
    balances: {
      flex: 1,
      justifyContent: 'center',
      marginLeft: 20,
      alignSelf: 'center',
    },
    ethLogo: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: 'hidden',
    },
    title: {
      paddingVertical: 4,
      paddingHorizontal: 15,
    } as TextStyle,
    text: {
      ...typography.sBodySM,
      marginVertical: 0,
    } as TextStyle,
    fiatBalance: {
      ...typography.sHeadingMD,
    } as TextStyle,
  });
};

export default styleSheet;
