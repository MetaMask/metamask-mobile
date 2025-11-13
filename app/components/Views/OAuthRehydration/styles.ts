import { Theme } from '../../../util/theme/models';
import { Platform, StatusBar, StyleSheet } from 'react-native';
import Device from '../../../util/device';
import { fontStyles } from '../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const {
    theme: { colors },
  } = params;

  return StyleSheet.create({
    mainWrapper: {
      paddingTop: Platform.select({
        android: StatusBar.currentHeight ?? 0,
        default: 0,
      }),
      flex: 1,
    },
    wrapper: {
      flex: 1,
    },
    container: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'center',
      flexDirection: 'column',
      width: '100%',
      paddingHorizontal: 24,
    },
    scrollContentContainer: {
      flex: 1,
    },
    oauthContentWrapper: {
      width: '100%',
      alignItems: 'center',
      marginTop: 10,
    },
    metamaskName: {
      width: 80,
      height: 40,
      alignSelf: 'center',
      marginTop: 10,
      tintColor: colors.icon.default,
    },
    foxWrapper: {
      justifyContent: 'center',
      alignSelf: 'center',
      width: Device.isIos() ? 175 : 150,
      height: Device.isIos() ? 175 : 150,
      marginTop: 48,
    },
    image: {
      alignSelf: 'center',
      width: Device.isIos() ? 175 : 150,
      height: Device.isIos() ? 175 : 150,
    },
    title: {
      textAlign: 'center',
      marginVertical: 24,
    },
    field: {
      flexDirection: 'column',
      width: '100%',
      rowGap: 8,
      justifyContent: 'flex-start',
    },
    label: {
      marginBottom: -4,
    },
    ctaWrapperRehydration: {
      width: '100%',
      flexDirection: 'column',
      alignItems: 'center',
      gap: Platform.select({
        ios: 0,
        android: 16,
      }),
      marginTop: 16,
    },
    footer: {
      marginTop: 32,
      alignItems: 'center',
    },
    helperTextContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      rowGap: 2,
      alignSelf: 'flex-start',
    },
    biometrics: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 30,
    },
    biometryLabel: {
      flex: 1,
      fontSize: 16,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    biometrySwitch: {
      flex: 0,
    },
    goBack: {
      marginVertical: 14,
      alignSelf: 'center',
    },
  });
};

export default styleSheet;
