// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Internal dependencies.
import { SkeletonStyleSheetVars, SkeletonShape } from './Skeleton.types';
/**
 * Style sheet function for Skeleton component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: SkeletonStyleSheetVars }) => {
  const { theme, vars } = params;
  const { style, width, height, shape } = vars;

  let borderRadius;
  switch (shape) {
    case SkeletonShape.Rectangle:
      borderRadius = 4;
      break;
    case SkeletonShape.Pill:
      borderRadius = height / 2;
      break;
    case SkeletonShape.Circle:
      borderRadius = 999;
      break;
    default:
      borderRadius = 4;
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        width: width || 10,
        height: height || 10,
        borderRadius,
        backgroundColor: '#a0a0a0',
        overflow: 'hidden',
      } as ViewStyle,
      style,
    ) as ViewStyle,
    animationContainer: {
      flex: 1,
    },
    gradient: {
      flex: 1,
    },
  });
};

export default styleSheet;
