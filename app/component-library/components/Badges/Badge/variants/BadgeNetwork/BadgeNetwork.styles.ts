// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { BadgeNetworkStyleSheetVars } from './BadgeNetwork.types';

const BADGE_SIZE = 16;
const BORDER_WIDTH = 1;

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
    base: {
      width: BADGE_SIZE,
      height: BADGE_SIZE,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 1,
    },
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
