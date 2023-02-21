// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { BadgeBaseStyleSheetVars } from './BadgeBase.types';

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
  vars: BadgeBaseStyleSheetVars;
}) => {
  const { vars } = params;
  const { style } = vars;

  return StyleSheet.create({
    base: Object.assign(
      {
        position: 'absolute',
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;
