import { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { typography } = theme;
  return StyleSheet.create({
    wrapper: {},
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
