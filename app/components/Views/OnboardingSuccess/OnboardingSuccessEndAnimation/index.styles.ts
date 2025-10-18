import { StyleSheet } from 'react-native';
import { getScreenDimensions } from '../../../../util/onboarding';

const createStyles = (dimensions: ReturnType<typeof getScreenDimensions>) =>
  StyleSheet.create({
    animationContainer: {
      height: dimensions.screenHeight * 0.5,
      justifyContent: 'center',
      alignItems: 'center',
    },
    animationWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    riveAnimation: {
      width: dimensions.screenWidth,
      height: dimensions.animationHeight,
      alignSelf: 'center',
    },
  });

export default createStyles;
