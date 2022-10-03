// Third party dependencies.
import { StyleSheet, TextStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { TextStyleSheetVars } from './Text.types';

/**
 * Style sheet function for Text component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: TextStyleSheetVars }) => {
  const { theme, vars } = params;
  const { variant, style } = vars;
  return StyleSheet.create({
    base: Object.assign(
      { color: theme.colors.text.default },
      theme.typography[variant],
      style,
    ) as TextStyle,
  });
};

export default styleSheet;
