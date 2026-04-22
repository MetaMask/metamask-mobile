import type { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';

const styleSheet = (params: {
  theme: Theme;
  vars: {
    selected: boolean;
  };
}) => {
  const {
    theme,
    vars: { selected },
  } = params;
  const { colors } = theme;
  const finalBackgroundColor = selected
    ? colors.background.muted
    : 'transparent';
  /** Matches {@link TimeRangeSelector} segment Pressables: `py-1`, `px-4`, `rounded-lg`, `flex-1`, `bg-muted` when selected. */
  return StyleSheet.create({
    button: {
      flex: 1,
      minWidth: 0,
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
