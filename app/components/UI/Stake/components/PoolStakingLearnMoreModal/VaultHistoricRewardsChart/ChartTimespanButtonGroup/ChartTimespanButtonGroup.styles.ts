import type { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

const styleSheet = (params: {
  theme: Theme;
  vars: { isSelected: boolean };
}) => {
  const { theme, vars } = params;
  const { isSelected } = vars;
  const { colors } = theme;

  return StyleSheet.create({
    chartTimespanButtonGroup: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      marginTop: 24,
      paddingBottom: 16,
      paddingHorizontal: 16,
    },
    chartTimespanButton: {
      flexDirection: 'column',
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 7,
      minHeight: 34,

      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isSelected
        ? colors.primary.default
        : colors.background.default,
      color: isSelected ? colors.info.inverse : colors.text.muted,
    },
  });
};

export default styleSheet;
