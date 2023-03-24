// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

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
  const { style, overlayColor } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        width: '100%',
        height: '100%',
        backgroundColor: overlayColor || theme.colors.overlay.default,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;
