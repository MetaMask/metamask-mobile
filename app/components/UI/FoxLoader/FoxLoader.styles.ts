// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Matches the native splash fox (144pt/dp) so the handoff stays seamless.
const STATIC_FOX_SIZE = 144;

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
      justifyContent: 'center',
      width: STATIC_FOX_SIZE,
      height: STATIC_FOX_SIZE,
      position: 'absolute',
      top: Math.round((screenH - STATIC_FOX_SIZE) / 2),
      left: Math.round((screenW - STATIC_FOX_SIZE) / 2),
    },
    staticFox: {
      width: STATIC_FOX_SIZE,
      height: STATIC_FOX_SIZE,
    },
  });
};

export default styleSheet;
