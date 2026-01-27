import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = (params: {
  theme: Theme;
  vars: {
    shouldShowSkipButton: boolean;
  };
}) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: params.theme.colors.background.default,
    },
    carouselWrapper: {
      flex: 1,
    },
    fullScreenContainer: {
      flex: 1,
    },
    scrollableContent: {
      flex: 1,
    },
    scrollContentContainer: {
      flexGrow: 1,
    },
    screenContainer: {
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      paddingHorizontal: 24,
      paddingTop: 12,
      flex: 1,
    },
    contentSection: {
      flex: 1,
    },
    animationContainer: {
      flex: 1,
    },
    animation: {
      maxHeight: 400, // needed for center alignment
      height: 400, // needed for android
    },
    title: {
      textAlign: 'left',
      marginBottom: 6,
    },
    description: {
      textAlign: 'left',
      marginBottom: 16,
    },
    subtitle: {
      textAlign: 'left',
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
    },
    footerTextContainer: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    footerText: {
      textAlign: 'center',
    },
    fundsInfoText: {
      textAlign: 'center',
      color: params.theme.colors.text.alternative,
    },
    buttonRow: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 16,
      marginBottom: 16,
    },
    skipButton: {
      paddingHorizontal: 16,
      alignSelf: 'center',
      opacity: params.vars.shouldShowSkipButton ? 1 : 0,
    },
    continueButton: {
      width: '100%',
    },
  });

export default createStyles;
