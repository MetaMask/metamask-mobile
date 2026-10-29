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

    /**
     * Invisible full-height measurement text. Must stay in the layout width of
     * the visible description so line wrapping matches, but must not affect
     * visual layout or accessibility.
     */
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
