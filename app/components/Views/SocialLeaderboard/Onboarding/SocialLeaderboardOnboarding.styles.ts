/* eslint-disable @metamask/design-tokens/color-no-hex */
import { StyleSheet } from 'react-native';
import { ONBOARDING_COLORS } from './constants';

const createStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    gradientBackground: {
      ...StyleSheet.absoluteFillObject,
    },
    topSection: {
      paddingTop: 0,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingBottom: 4,
      gap: 6,
    },
    closeRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingBottom: 0,
    },
    closeButton: {
      padding: 8,
    },
    progressSegment: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: ONBOARDING_COLORS.progressInactive,
    },
    progressSegmentActive: {
      backgroundColor: ONBOARDING_COLORS.progressActive,
    },
    carouselWrapper: {
      flex: 1,
      minHeight: 0,
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
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 0,
      paddingBottom: 8,
    },
    onBrandText: {
      color: ONBOARDING_COLORS.onBrandText,
    },
    onBrandTextMuted: {
      color: ONBOARDING_COLORS.onBrandTextMuted,
    },
    title: {
      textAlign: 'center',
      alignSelf: 'stretch',
      marginBottom: 8,
      color: ONBOARDING_COLORS.onBrandText,
    },
    description: {
      textAlign: 'center',
      alignSelf: 'stretch',
      marginBottom: 16,
      opacity: 0.6,
      color: ONBOARDING_COLORS.onBrandTextMuted,
    },
    contentSection: {
      flex: 1,
      justifyContent: 'center',
    },
    animationSlot: {
      width: '100%',
      height: 380,
      maxHeight: 380,
      borderRadius: 16,
      backgroundColor: ONBOARDING_COLORS.animationSlot,
    },
    cardsContainer: {
      gap: 16,
    },
    footer: {
      paddingHorizontal: 16,
    },
    buttonRow: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 12,
      marginBottom: 8,
    },
    secondaryButton: {
      width: '100%',
      backgroundColor: ONBOARDING_COLORS.secondaryButtonBackground,
      borderRadius: 999,
      minHeight: 48,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
  });

export default createStyles;
