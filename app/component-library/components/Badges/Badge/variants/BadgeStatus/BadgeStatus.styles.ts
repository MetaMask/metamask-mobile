// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import {
  BadgeStatusState,
  BadgeStatusStyleSheetVars,
} from './BadgeStatus.types';

/**
 * Style sheet function for BadgeStatus component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: BadgeStatusStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { style, state, borderColor } = vars;
  let stateColor;

  switch (state) {
    case BadgeStatusState.Active:
      stateColor = theme.colors.success.default;
      break;
    case BadgeStatusState.Inactive:
      stateColor = theme.colors.icon.alternative;
      break;
    default:
      stateColor = theme.colors.icon.alternative;
      break;
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        height: 10,
        width: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: borderColor || theme.colors.background.default,
        backgroundColor: stateColor,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;
