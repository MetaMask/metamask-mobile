import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    animationContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.default,
      paddingTop: 80,
      paddingBottom: 140,
    },
    animationWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textWrapper: {
      justifyContent: 'flex-end',
    },
    riveAnimation: {
      width: 360,
      height: 360,
      alignSelf: 'center',
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
