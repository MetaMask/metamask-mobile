import { StyleSheet, TextStyle } from 'react-native';
import { BaseTextStyleSheet, BaseTextStyleSheetVars } from './BaseText.types';
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for BaseText component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: BaseTextStyleSheetVars;
}): BaseTextStyleSheet => {
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
