// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

/**
 * Style sheet function for Overlay component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: any }) => {
  const { theme, vars } = params;
  const { style, bottomSheetNotchColor } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        width: '100%',
        height: 4,
        alignItems: 'center',
      } as ViewStyle,
      style,
    ) as ViewStyle,
    notch: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: bottomSheetNotchColor || theme.colors.border.muted,
    },
  });
};

export default styleSheet;
