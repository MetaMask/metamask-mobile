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
    perpsPositionHeader: {
      paddingHorizontal: 16,
      paddingTop: 24,
    },
  });
};

export default styleSheet;
