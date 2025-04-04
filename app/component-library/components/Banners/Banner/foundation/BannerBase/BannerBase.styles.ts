// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { BannerBaseStyleSheetVars } from './BannerBase.types';

/**
 * Style sheet function for BannerBase component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: BannerBaseStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { style } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        flexDirection: 'row',
        borderRadius: 4,
        backgroundColor: theme.colors.background.default,
        padding: 12,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    startAccessory: {
      marginRight: 8,
    },
    info: {
      flex: 1,
    },
    endAccessory: {
      marginLeft: 12,
    },
  });
};

export default styleSheet;
