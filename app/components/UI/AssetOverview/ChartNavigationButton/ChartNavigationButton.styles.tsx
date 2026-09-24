import type { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';

const styleSheet = (params: {
  theme: Theme;
  vars: {
    selected: boolean;
    selectedColor?: string;
  };
}) => {
  const {
    theme,
    vars: { selected, selectedColor },
  } = params;
  const { colors } = theme;
  const finalBackgroundColor = selected
    ? (selectedColor ?? colors.background.muted)
    : 'transparent';
  /** Fully rounded custom chart-picker button. */
  return StyleSheet.create({
    button: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: finalBackgroundColor,
      borderRadius: 9999,
      paddingVertical: 4,
      paddingHorizontal: 16,
    },
    label: {
      textAlign: 'center',
    } as TextStyle,
  });
};

export default styleSheet;
