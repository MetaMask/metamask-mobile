import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = (params: {
  theme: Theme;
  vars: { shouldShowSkipButton: boolean };
}) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: params.theme.colors.background.default,
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
      paddingTop: 12,
    },
    headerSection: {
      height: 160,
      justifyContent: 'flex-start',
      alignItems: 'stretch',
    },
    contentSection: {
      flex: 1,
    },
    animation: {
      bottom: 50,
      flex: 1,
    },
    title: {
      textAlign: 'left',
      marginBottom: 6,
      fontSize: 26,
      lineHeight: 30,
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
      marginVertical: 8,
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
  });

export default createStyles;
