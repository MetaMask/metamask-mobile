// Third party dependencies.
import { StyleSheet, Platform } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Fox size matched to the native splash asset across all tested devices:
export const FOX_SIZE = Platform.OS === 'android' ? 142 : 126;
// Static fox PNG size — matches the fox asset's natural dimensions
const STATIC_FOX_SIZE = 98;
// Vertical correction derived from the Rive artboard (256x256).
// The fox's visual center in the artboard sits at y≈120.5 (not 128),
// so after Fit.Contain scaling to FOX_SIZE the fox center lands at ~66.8px
// rather than 71px (the geometric center). Shifting top up by 4px aligns
// the static PNG with the Rive fox at t=0.
const STATIC_FOX_VERTICAL_OFFSET = 2;

/**
 * Style sheet function for FoxLoader component.
 *
 * @param params Style sheet params.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: { screenH: number; screenW: number };
}) => {
  const { theme, vars } = params;
  const { colors } = theme;
  const { screenH, screenW } = vars;

  return StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    animationWrapper: {
      alignItems: 'center',
      width: FOX_SIZE,
      height: FOX_SIZE,
      position: 'absolute',
      top: Math.round((screenH - FOX_SIZE) / 2),
      left: Math.round((screenW - FOX_SIZE) / 2),
    },
    riveAnimation: {
      width: FOX_SIZE,
      height: FOX_SIZE,
    },
    staticFox: {
      width: STATIC_FOX_SIZE,
      height: STATIC_FOX_SIZE,
      position: 'absolute',
      // Explicit pixel offsets — avoids percentage-based positioning that rounds
      // differently across device densities. The vertical offset shifts the fox
      // up to match where the Rive fox renders at t=0 (artboard center is not
      // at 50%: measured center y≈120.5/256 vs 128/256 geometric center).
      top: (FOX_SIZE - STATIC_FOX_SIZE) / 2 - STATIC_FOX_VERTICAL_OFFSET,
      left: (FOX_SIZE - STATIC_FOX_SIZE) / 2,
    },
  });
};

export default styleSheet;
