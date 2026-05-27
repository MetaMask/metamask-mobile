import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../util/theme/models';
import Device from '../../../../../util/device';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    safeArea: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: {
      textAlign: 'center',
    },
    backButton: {
      padding: 8,
    },
    headerSideSlot: {
      width: 40,
    },
    progressDots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 12,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
      backgroundColor: theme.colors.icon.muted,
    },
    dotActive: {
      width: 24,
      backgroundColor: theme.colors.primary.default,
    },
    body: {
      flex: 1,
      paddingHorizontal: 16,
    },
    bodyContent: {
      paddingBottom: 24,
    },
    iconBadge: {
      alignSelf: 'center',
      width: 72,
      height: 72,
      borderRadius: 16,
      backgroundColor: theme.colors.background.alternative,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      marginBottom: 24,
    },
    title: {
      textAlign: 'center',
      marginBottom: 12,
    },
    subtitle: {
      textAlign: 'center',
      color: theme.colors.text.alternative,
      marginBottom: 24,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background.alternative,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    optionSelected: {
      borderWidth: 1,
      borderColor: theme.colors.primary.default,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: theme.colors.icon.muted,
      marginRight: 12,
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
      marginTop: 2,
    },
    redFlag: {
      marginLeft: 8,
    },
    calloutInfo: {
      backgroundColor: theme.colors.warning.muted,
      borderColor: theme.colors.warning.default,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginTop: 24,
      flexDirection: 'row',
    },
    calloutWarn: {
      backgroundColor: theme.colors.error.muted,
      borderColor: theme.colors.error.default,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginTop: 24,
      flexDirection: 'row',
    },
    calloutIcon: {
      marginRight: 12,
    },
    calloutTextContainer: {
      flex: 1,
    },
    calloutTitleInfo: {
      color: theme.colors.warning.default,
      marginBottom: 4,
    },
    calloutTitleWarn: {
      color: theme.colors.error.default,
      marginBottom: 4,
    },
    calloutBody: {
      color: theme.colors.text.default,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: Device.isIphoneX() ? 24 : 16,
    },
    warningIconBadge: {
      alignSelf: 'center',
      width: 96,
      height: 96,
      borderRadius: 20,
      backgroundColor: theme.colors.error.muted,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
      marginBottom: 24,
    },
    warningTitle: {
      textAlign: 'center',
      color: theme.colors.error.default,
      marginBottom: 16,
    },
    warningBody: {
      textAlign: 'center',
      color: theme.colors.text.alternative,
      marginBottom: 32,
      paddingHorizontal: 8,
    },
    warningPrimaryButton: {
      marginBottom: 12,
    },
    warningSecondaryButton: {
      marginBottom: 16,
    },
    bypassText: {
      textAlign: 'center',
      color: theme.colors.text.muted,
      textDecorationLine: 'underline',
      paddingVertical: 8,
    },
  });
};

export default styleSheet;
