import type { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    buttonLabel: {
      color: colors.primary.default,
      paddingTop: 8,
      textAlign: 'center',
    },

    disclaimer: {
      paddingTop: 16,
    } as TextStyle,
  });
};

export default styleSheet;
