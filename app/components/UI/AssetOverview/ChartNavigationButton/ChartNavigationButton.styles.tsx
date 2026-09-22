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
  /** Matches {@link TimeRangeSelector} segment Pressables: `py-1`, `px-4`, `rounded-lg`, `grow`, `bg-muted` when selected. */
  return StyleSheet.create({
    button: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: finalBackgroundColor,
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 16,
    },
    label: {
      textAlign: 'center',
    } as TextStyle,
  });
};

export default styleSheet;
