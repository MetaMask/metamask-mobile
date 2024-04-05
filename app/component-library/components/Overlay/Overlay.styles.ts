// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Internal dependencies.
import { OverlayStyleSheetVars } from './Overlay.types';
/**
 * Style sheet function for Overlay component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: OverlayStyleSheetVars }) => {
  const { theme, vars } = params;
  const { style, color } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: color || theme.colors.overlay.default,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    fill: {
      flex: 1,
    },
  });
};

export default styleSheet;
