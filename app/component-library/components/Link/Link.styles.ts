import { StyleSheet, TextStyle } from 'react-native';
import { LinkStyleSheet, LinkStyleSheetVars } from './Link.types';
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for Link component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: LinkStyleSheetVars;
}): LinkStyleSheet => {
  const { theme, vars } = params;
  const { style } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {},
      { color: theme.colors.primary.default } as TextStyle,
      style,
    ) as TextStyle,
  });
};

export default styleSheet;
