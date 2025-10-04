import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    animationContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      marginHorizontal: -16,
      minHeight: 400,
    },
    riveAnimation: {
      width: '100%',
      height: '100%',
      alignSelf: 'stretch',
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
      marginBottom: 12,
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
