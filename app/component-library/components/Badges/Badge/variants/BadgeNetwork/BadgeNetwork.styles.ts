// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { BadgeNetworkStyleSheetVars } from './BadgeNetwork.types';

const BORDER_WIDTH = 2;

/**
 * Style sheet function for BadgeNetwork component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: BadgeNetworkStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { style } = vars;

  return StyleSheet.create({
    base: {},
    networkIcon: Object.assign(
      {
        borderWidth: BORDER_WIDTH,
        borderColor: theme.colors.background.default,
        ...theme.shadows.size.xs,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;
