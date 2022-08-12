// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Internal dependencies.
import { BadgeWrapperStyleSheetVars } from './BadgeWrapper.types';

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
  vars: BadgeWrapperStyleSheetVars;
}) => {
  const { vars } = params;
  const { style, contentStyle } = vars;

  return StyleSheet.create({
    base: Object.assign(
      {
        alignSelf: 'flex-start',
      } as ViewStyle,
      style,
    ) as ViewStyle,
    content: Object.assign(
      {
        position: 'absolute',
        top: -4,
        right: -4,
      } as ViewStyle,
      contentStyle,
    ) as ViewStyle,
  });
};

export default styleSheet;
