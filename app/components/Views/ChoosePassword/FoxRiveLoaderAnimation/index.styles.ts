import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';
import { getScreenDimensions } from '../../../../util/onboarding';

const createStyles = (
  colors: Theme['colors'],
  dimensions: ReturnType<typeof getScreenDimensions>,
) =>
  StyleSheet.create({
    animationContainer: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'center',
      backgroundColor: colors.background.default,
      paddingTop: 30,
    },
    animationWrapper: {
      width: dimensions.screenWidth,
      height: dimensions.animationHeight,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.default,
    },
    textWrapper: {
      justifyContent: 'flex-end',
      width: dimensions.screenWidth,
      paddingHorizontal: 20,
    },
    riveAnimation: {
      width: dimensions.screenWidth * 0.4,
      height: dimensions.animationHeight,
      alignSelf: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.default,
    },
    textOverlay: {
      position: 'absolute',
      top: '50%',
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      marginTop: 60,
    },
    textTitle: {
      textAlign: 'center',
      fontSize: 28,
      fontWeight: '600',
      color: colors.text.default,
      lineHeight: 36,
      paddingHorizontal: 40,
    },
    fadeOutContainer: {
      position: 'absolute',
    },
    fadeInContainer: {
      opacity: 1,
    },
    contentContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default createStyles;
