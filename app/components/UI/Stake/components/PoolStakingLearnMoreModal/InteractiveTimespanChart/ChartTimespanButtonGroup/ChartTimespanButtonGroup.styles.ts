import type { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

const styleSheet = (params: {
  theme: Theme;
  vars: { isSelected: boolean };
}) => {
  const { theme, vars } = params;
  const { isSelected } = vars;
  const { colors } = theme;

  const baseStyles = StyleSheet.create({
    chartTimespanButton: {
      borderRadius: 32,
      paddingHorizontal: 16,
      paddingVertical: 7,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isSelected
        ? colors.background.muted
        : colors.background.default,
    },
  });

  return StyleSheet.create({
    chartTimespanButtonGroup: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 24,
      paddingBottom: 16,
      flexWrap: 'wrap',
      gap: 12,
    },
    chartTimespanButtonGroupSkeleton: {
      flexDirection: 'row',
      gap: 12,
    },
    chartTimespanButton: baseStyles.chartTimespanButton,
    chartTimespanButtonSkeleton: {
      ...baseStyles.chartTimespanButton,
      minWidth: 49,
    },
  });
};

export default styleSheet;
