// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { ButtonHeroStyleSheetVars } from './ButtonHero.types';

/**
 * Style sheet function for ButtonHero component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: ButtonHeroStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style, pressed } = vars;

  // Use primary colors - default for normal state, defaultPressed for pressed state
  const backgroundColor = pressed
    ? colors.icon.defaultPressed
    : colors.icon.default;

  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor,
      },
      StyleSheet.flatten(style),
    ) as ViewStyle,
  });
};

export default styleSheet;