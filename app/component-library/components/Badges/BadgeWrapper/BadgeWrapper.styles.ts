// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

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
  const { style, badgePositions, badgeScale } = vars;
  const scalePercentage = badgeScale || 1;
  return StyleSheet.create({
    base: Object.assign(
      { alignSelf: 'flex-start' } as ViewStyle,
      style,
    ) as ViewStyle,
    badge: {
      position: 'absolute',
      transform: [{ scale: scalePercentage }],
      ...badgePositions,
    },
  });
};

export default styleSheet;
