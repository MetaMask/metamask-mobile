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

    // Off-screen, zero-opacity copy used only to measure the unclamped line
    // count. Full width so it wraps exactly like the visible description.
    measureText: {
      position: 'absolute',
      opacity: 0,
      width: '100%',
    } as TextStyle,

    disclaimer: {
      paddingTop: 16,
    } as TextStyle,
  });
};

export default styleSheet;
