// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { AvatarFaviconStyleSheetVars } from './AvatarFavicon.types';

/**
 * Style sheet function for AvatarFavicon component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: AvatarFaviconStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { colors } = theme;
  const { style, error } = vars;
  const baseStyle: ViewStyle = error
    ? {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background.alternative,
      }
    : { borderRadius: 0 };

  return StyleSheet.create({
    base: Object.assign(baseStyle, style) as ViewStyle,
    image: { flex: 1, height: undefined, width: undefined },
  });
};

export default styleSheet;
