// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Fox size matched to the native splash asset across all tested devices:
// Pixel 4, Pixel 8, iPhone 17 Pro — 142 aligns perfectly with the native splash.
const FOX_SIZE = 142;
// Static fox PNG size — matches the fox asset's natural dimensions
const STATIC_FOX_SIZE = 98;

/**
 * Style sheet function for FoxLoader component.
 *
 * @param params Style sheet params.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

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
    },
    riveAnimation: {
      width: FOX_SIZE,
      height: FOX_SIZE,
    },
    staticFox: {
      width: STATIC_FOX_SIZE,
      height: STATIC_FOX_SIZE,
      position: 'absolute',
      top: '50%',
      marginTop: -(STATIC_FOX_SIZE / 2),
    },
    hidden: {
      opacity: 0,
    },
  });
};

export default styleSheet;
