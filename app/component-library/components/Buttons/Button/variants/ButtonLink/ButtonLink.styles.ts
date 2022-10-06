// Third party dependencies.
import { StyleSheet, TextStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { ButtonLinkStyleSheetVars } from './ButtonLink.types';
/**
 * Style sheet function for ButtonLink component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: ButtonLinkStyleSheetVars;
}) => {
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
