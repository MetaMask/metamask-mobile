// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { IconInACircleStyleSheetVars } from './IconInACircle.types';

/**
 * Style sheet function for Badge component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: IconInACircleStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { style, backgroundColor } = vars;
  const themedBackgroundColor =
    backgroundColor || theme.colors.background.alternative;

  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor: themedBackgroundColor,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;
