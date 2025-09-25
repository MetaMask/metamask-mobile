import { StyleSheet, Dimensions } from 'react-native';
import { Theme } from '../../../../../util/theme/models';
import Device from '../../../../../util/device';

const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = Dimensions.get('window');

const createStyles = (params: {
  theme: Theme;
  vars: { shouldShowSkipButton: boolean };
}) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: params.theme.colors.background.default,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    carouselWrapper: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'stretch',
    },
    screenContainer: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    contentContainer: {
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      paddingVertical: 0,
      maxWidth: DEVICE_WIDTH - 48,
    },
    title: {
      textAlign: 'left',
      marginBottom: 16,
      fontSize: Device.isMediumDevice() ? 24 : 28,
      lineHeight: Device.isMediumDevice() ? 28 : 32,
    },
    description: {
      textAlign: 'left',
      lineHeight: 22,
      marginBottom: 16,
    },
    subtitle: {
      textAlign: 'left',
      lineHeight: 22,
    },
    progressContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 16,
      gap: 4,
    },
    progressDot: {
      width: 12,
      height: 12,
      borderRadius: 9,
      backgroundColor: params.theme.colors.background.muted,
    },
    progressDotActive: {
      width: 23,
      backgroundColor: params.theme.colors.text.default,
      borderRadius: 9,
    },
    footer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    fundsInfoText: {
      textAlign: 'center',
      color: params.theme.colors.text.alternative,
    },
    buttonRow: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 16,
    },
    skipButton: {
      paddingHorizontal: 16,
      marginBottom: 16,
      alignSelf: 'center',
      opacity: params.vars.shouldShowSkipButton ? 1 : 0,
    },
    continueButton: {
      width: '100%',
    },
    animationContainer: {
      // TEMP Possibly: Waiting for Rive animations to be exported without fullscreen frame.
      height: Math.min(DEVICE_HEIGHT * 0.45, 400), // Responsive height, max 400px
      width: '100%',
    },
  });

export default createStyles;
