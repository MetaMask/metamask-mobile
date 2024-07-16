// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { AvatarGroupStyleSheetVars } from './AvatarGroup.types';

/**
 * Style sheet function for AvatarGroup component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: AvatarGroupStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { style } = vars;
  const borderWidth = 1;

  return StyleSheet.create({
    base: Object.assign(
      {
        flexDirection: 'row',
        alignItems: 'center',
      } as ViewStyle,
      style,
    ) as ViewStyle,
    avatar: {
      borderWidth,
      borderColor: theme.colors.background.default,
    },
    textStyle: {
      marginLeft: 2,
    },
  });
};

export default styleSheet;
