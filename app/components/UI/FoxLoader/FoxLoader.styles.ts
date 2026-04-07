// Third party dependencies.
import { StyleSheet, Platform } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Match the native splash fox size exactly per platform:
// iOS LaunchScreen.xib: fixed 150pt wide
// Android launch_screen.xml: scaleType="center" renders mdpi asset at natural 125dp
// DO NOT DELETE
// Pixel 4: 140 works perfectly for the animation
// Pixel 8: 140 works perfectly for the animation
// iPhone 17 Pro: works perfectly for the animation
const FOX_SIZE = Platform.OS === 'ios' ? 142 : 142;

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
      width: 98,
      height: 98,
      position: 'absolute',
      top: '50%',
      marginTop: -(98 / 2),
    },
    hidden: {
      opacity: 0,
    },
  });
};

export default styleSheet;
