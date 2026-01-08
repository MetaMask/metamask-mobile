import type { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';
import {
  getFontFamily,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors, typography } = theme;
  return StyleSheet.create({
    wrapper: {
      paddingTop: 20,
    },
    warningWrapper: {
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    warning: {
      ...typography.sBodyMD,
      fontFamily: getFontFamily(TextVariant.BodyMD),
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.warning.default,
      backgroundColor: colors.warning.muted,
      padding: 20,
    } as TextStyle,
    warningLinks: {
      ...typography.sBodyMD,
      fontFamily: getFontFamily(TextVariant.BodyMD),
      color: colors.primary.default,
    } as TextStyle,
    chartNavigationWrapper: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 10,
      paddingTop: 20,
      marginBottom: 16,
    },
    balanceButtons: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingTop: 20,
      paddingHorizontal: 16,
    },
    activitiesButton: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      padding: 16,
    },
    buttonWrapper: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 12,
      fontStyle: 'normal',
      fontWeight: '400',
      lineHeight: 20,
      letterSpacing: 0.25,
    },
    containerStyle: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      paddingTop: 16,
      paddingVertical: 2,
    },
    icon: {
      marginHorizontal: 16,
    },
    footerButton: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: '50%',
    },
    receiveButton: {
      marginRight: 8,
    },
    sendButton: {
      marginLeft: 8,
    },
    aboutWrapper: {
      marginBottom: 20,
      paddingHorizontal: 16,
    },
    tokenDetailsWrapper: {
      marginBottom: 20,
      paddingHorizontal: 16,
    },
    rewardSection: {
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    rewardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    rewardLeftContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    rewardIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background.alternative,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    rewardTextContent: {
      flex: 1,
    },
    rewardTitle: {
      ...typography.lBodyMD,
      color: colors.text.default,
      marginBottom: 4,
    } as TextStyle,
    rewardSubtitle: {
      ...typography.sBodyMD,
      color: colors.text.alternative,
    } as TextStyle,
    rewardValue: {
      ...typography.lBodyMD,
      color: colors.text.default,
    } as TextStyle,
    rewardFiatDisplay: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border.default,
      backgroundColor: colors.background.default,
    },
    rewardFiatText: {
      ...typography.lBodyMD,
      color: colors.text.default,
      fontWeight: '600',
    } as TextStyle,
    claimButtonContainer: {
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    claimButton: {
      backgroundColor: colors.primary.default,
      paddingVertical: 12,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    claimButtonText: {
      ...typography.lBodyMD,
      color: colors.primary.inverse,
      fontWeight: '600',
    } as TextStyle,
  });
};

export default styleSheet;
