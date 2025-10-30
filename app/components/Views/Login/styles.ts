import { Theme } from '../../../util/theme/models';
import { Platform, StatusBar, StyleSheet } from 'react-native';
import Device from '../../../util/device';
import { fontStyles, colors as importedColors } from '../../../styles/common';
const deviceHeight = Device.getDeviceHeight();
const breakPoint = deviceHeight < 700;

const styleSheet = (params: { theme: Theme }) => {
  const {
    theme: { colors, themeAppearance },
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
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      width: '100%',
      paddingHorizontal: 24,
    },
    scrollContentContainer: {
      flex: 1,
    },
    foxAnimationWrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 200,
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
    ctaWrapper: {
      width: '100%',
      flexDirection: 'column',
      alignItems: 'center',
      gap: Platform.select({
        ios: 0,
        android: 16,
      }),
      marginTop: Platform.select({
        ios: -16,
        android: 16,
      }),
    },
    footer: {
      marginTop: 32,
      alignItems: 'center',
    },
    goBack: {
      marginVertical: 0,
      alignSelf: 'center',
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
    cant: {
      width: 280,
      alignSelf: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    },
    areYouSure: {
      width: '100%',
      padding: breakPoint ? 16 : 24,
      justifyContent: 'center',
      alignSelf: 'center',
    },
    heading: {
      marginHorizontal: 6,
      color: colors.text.default,
      ...fontStyles.bold,
      fontSize: 20,
      textAlign: 'center',
      lineHeight: breakPoint ? 24 : 26,
    },
    red: {
      marginHorizontal: 24,
      color: colors.error.default,
    },
    warningText: {
      ...fontStyles.normal,
      textAlign: 'center',
      fontSize: 14,
      lineHeight: breakPoint ? 18 : 22,
      color: colors.text.default,
      marginTop: 20,
    },
    warningIcon: {
      alignSelf: 'center',
      color: colors.error.default,
      marginVertical: 10,
    },
    bold: {
      ...fontStyles.bold,
    },
    delete: {
      marginBottom: 20,
    },
    deleteWarningMsg: {
      ...fontStyles.normal,
      fontSize: 16,
      lineHeight: 20,
      marginTop: 10,
      color: colors.error.default,
    },
    oauthContentWrapper: {
      width: '100%',
      alignItems: 'center',
      marginTop: Platform.select({
        ios: -200,
        android: -180,
      }),
    },
    metamaskName: {
      width: 80,
      height: 40,
      alignSelf: 'center',
      marginTop: 0,
      tintColor: colors.icon.default,
    },
    input: {
      width: '100%',
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    hintText: {
      textAlign: 'left',
    },
    helperTextContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      rowGap: 2,
      alignSelf: 'flex-start',
    },
    textField: {
      backgroundColor:
        themeAppearance === 'dark'
          ? importedColors.gettingStartedTextColor
          : importedColors.gettingStartedPageBackgroundColorLightMode,
    },
  });
};

export default styleSheet;
