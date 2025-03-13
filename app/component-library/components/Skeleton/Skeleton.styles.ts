// Third party dependencies.
import { ViewStyle, StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Internal dependencies.
import { SkeletonStyleSheetVars } from './Skeleton.types';

/**
 * Style sheet function for Skeleton component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: SkeletonStyleSheetVars }) => {
  const { vars, theme } = params;
  const { height, width, style } = vars;

  return StyleSheet.create({
    base: Object.assign(
      {
        borderRadius: 4,
        overflow: 'hidden',
        // Only apply explicit height/width if provided
        ...(height !== undefined && { height }),
        ...(width !== undefined && { width }),
      } as ViewStyle,
      style,
    ) as ViewStyle,
    background: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.icon.alternative,
      borderRadius: 4,
    } as ViewStyle,
    hideChildren: {
      opacity: 0,
    },
    childrenContainer: {
      position: 'relative',
      zIndex: 1,
    },
  });
};

export default styleSheet;
