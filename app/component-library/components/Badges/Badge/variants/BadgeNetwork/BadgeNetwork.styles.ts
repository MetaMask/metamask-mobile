// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { BadgeNetworkStyleSheetVars } from './BadgeNetwork.types';
import getScaledStyles from './BadgeNetwork.utils';

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
  const { style, containerSize, size, isScaled } = vars;

  let opacity = 0;

  if (containerSize) {
    // This is so that the BadgeNetwork won't be visible until a containerSize is known
    opacity = 1;
  }

  let baseStyles = {};
  let networkIconStyles = {};

  if (isScaled) {
    const scaledStyles = getScaledStyles(Number(size), containerSize);
    baseStyles = {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: scaledStyles.minHeight,
      maxHeight: scaledStyles.maxHeight,
      height: scaledStyles.height,
      aspectRatio: 1,
      opacity,
    };
    networkIconStyles = {
      transform: [{ scale: scaledStyles.scaleRatio }],
      borderWidth: scaledStyles.borderWidth,
      borderColor: theme.colors.background.default,
      ...theme.shadows.size.xs,
    };
  }

  return StyleSheet.create({
    base: baseStyles,
    networkIcon: Object.assign(
      isScaled ? networkIconStyles : {},
      {
        borderWidth: Number(size) * (1 / 16),
        borderColor: theme.colors.background.default,
        ...theme.shadows.size.xs,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;
