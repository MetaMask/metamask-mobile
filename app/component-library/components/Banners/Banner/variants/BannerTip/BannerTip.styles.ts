// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { BannerTipStyleSheetVars } from './BannerTip.types';

/**
 * Style sheet function for BannerTip component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: BannerTipStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { style } = vars;

  return StyleSheet.create({
    base: Object.assign(
      {
        borderWidth: 1,
        borderColor: theme.colors.border.default,
        backgroundColor: theme.colors.background.default,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    logoContainer: {
      alignSelf: 'stretch',
      alignContent: 'center',
    },
    logo: {
      width: 60,
      height: 55,
    },
  });
};

export default styleSheet;
