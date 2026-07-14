import { StyleSheet } from 'react-native';

import { Theme } from '../../../util/theme/models';
import Device from '../../../util/device';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    // Paints the status-bar area in the page color.
    fullBleed: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },

    // Header — sticky top bar with centered title + slim animated progress bar
    header: {
      paddingHorizontal: 8,
      paddingTop: 4,
      paddingBottom: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      height: 48,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: theme.colors.text.default,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
    },
    headerSideSlot: {
      width: 40,
      height: 40,
    },
    progressBarTrack: {
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.colors.background.alternative,
      marginHorizontal: 8,
      marginTop: 4,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 2,
      backgroundColor: theme.colors.primary.default,
    },

    // Question body
    body: {
      flex: 1,
      paddingHorizontal: 20,
    },
    bodyContent: {
      paddingTop: 16,
      paddingBottom: 32,
    },
    iconBadge: {
      alignSelf: 'center',
      width: 80,
      height: 80,
      borderRadius: 24,
      backgroundColor: theme.colors.background.alternative,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      marginBottom: 28,
    },
    title: {
      textAlign: 'center',
      marginBottom: 12,
      color: theme.colors.text.default,
      paddingHorizontal: 4,
    },
    subtitle: {
      textAlign: 'center',
      color: theme.colors.text.alternative,
      marginBottom: 28,
      paddingHorizontal: 8,
      lineHeight: 22,
    },

    // Option cards
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background.alternative,
      borderRadius: 16,
      borderWidth: 1.5,
      // Match background so unselected reserves space without a visible border.
      borderColor: theme.colors.background.alternative,
      paddingHorizontal: 18,
      paddingVertical: 18,
      marginBottom: 10,
    },
    optionSelected: {
      borderColor: theme.colors.primary.default,
      backgroundColor: theme.colors.primary.muted,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: theme.colors.icon.alternative,
      marginRight: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: {
      borderColor: theme.colors.primary.default,
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.primary.default,
    },
    optionTextContainer: {
      flex: 1,
    },
    optionTitle: {
      color: theme.colors.text.default,
    },
    optionSubtitle: {
      color: theme.colors.text.alternative,
      marginTop: 4,
      lineHeight: 18,
    },

    // Footer CTA
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: Device.isIphoneX() ? 24 : 16,
      backgroundColor: theme.colors.background.default,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.muted,
    },

    // Scam warning screen
    warningIconBadge: {
      alignSelf: 'center',
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.error.muted,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
      marginBottom: 24,
    },
    warningTitle: {
      textAlign: 'left',
      color: theme.colors.error.default,
      marginBottom: 28,
    },
    // Bulleted reasons — small red icon paired with left-aligned supporting copy
    warningReason: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 20,
    },
    warningReasonIcon: {
      marginRight: 12,
      marginTop: 2,
    },
    warningReasonText: {
      flex: 1,
      color: theme.colors.text.alternative,
      lineHeight: 22,
    },
    warningPrimaryButton: {
      marginBottom: 12,
    },
    warningSecondaryButton: {
      marginBottom: 0,
    },
    bypassText: {
      textAlign: 'center',
      color: theme.colors.error.default,
      textDecorationLine: 'underline',
      paddingVertical: 12,
      marginBottom: 12,
    },
    // Dimmed bypass link while the countdown is still active.
    bypassTextDisabled: {
      textAlign: 'center',
      color: theme.colors.text.muted,
      paddingVertical: 12,
      marginBottom: 12,
    },
  });
};

export default styleSheet;
