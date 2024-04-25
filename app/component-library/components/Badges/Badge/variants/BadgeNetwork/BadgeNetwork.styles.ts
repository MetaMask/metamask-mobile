// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { BadgeNetworkStyleSheetVars } from './BadgeNetwork.types';

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
  const { style, containerSize, size } = vars;
  let scaleRatio = 1;
  let opacity = 0;
  let borderWidth = 1;

  if (containerSize) {
    scaleRatio = containerSize.height / Number(size);
    opacity = 1;
    borderWidth /= scaleRatio;
  }

  return StyleSheet.create({
    base: {
      height: '50%',
      aspectRatio: 1,
      minHeight: 8,
      alignItems: 'center',
      justifyContent: 'center',
      opacity,
    },
    networkIcon: Object.assign(
      {
        transform: [{ scale: scaleRatio }],
        borderWidth,
        borderRadius: 999,
        borderColor: theme.colors.background.default,
        ...theme.shadows.size.xs,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;
