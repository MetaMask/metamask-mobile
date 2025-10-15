import { StyleSheet } from 'react-native';
import { ScreenDimensions } from '../../../hooks/useScreenDimensions';

const createStyles = (dimensions: ScreenDimensions) =>
  StyleSheet.create({
    animationContainer: {
      flex: 1,
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
