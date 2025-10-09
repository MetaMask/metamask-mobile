import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import Device from '../../../util/device';

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
      paddingHorizontal: 24,
      paddingTop: 60,
      paddingBottom: 40,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    animationContainer: {
      width: Device.isMediumDevice() ? 200 : 240,
      height: Device.isMediumDevice() ? 200 : 240,
      marginBottom: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    foxAnimation: {
      width: '100%',
      height: '100%',
    },
    textContainer: {
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    title: {
      textAlign: 'center',
      marginBottom: 16,
      color: colors.text.default,
    },
    buttonContainer: {
      paddingTop: 20,
    },
  });

export default createStyles;
