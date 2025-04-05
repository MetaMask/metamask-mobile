import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';
import Device from '../../../util/device';
import { fontStyles } from '../../../styles/common';
const deviceHeight = Device.getDeviceHeight();
const breakPoint = deviceHeight < 700;

const styleSheet = (params: { theme: Theme }) => {
  const {
    theme: { colors },
  } = params;

  return StyleSheet.create({
    mainWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    wrapper: {
      flex: 1,
      paddingHorizontal: 32,
    },
    foxWrapper: {
      justifyContent: 'center',
      alignSelf: 'center',
      width: Device.isIos() ? 130 : 100,
      height: Device.isIos() ? 130 : 100,
      marginTop: 100,
    },
    image: {
      alignSelf: 'center',
      width: Device.isIos() ? 130 : 100,
      height: Device.isIos() ? 130 : 100,
    },
    title: {
      fontSize: Device.isAndroid() ? 30 : 35,
      lineHeight: Device.isAndroid() ? 35 : 40,
      marginTop: 20,
      marginBottom: 20,
      color: colors.text.default,
      justifyContent: 'center',
      textAlign: 'center',
      ...fontStyles.bold,
    },
    field: {
      flex: 1,
      marginBottom: Device.isAndroid() ? 0 : 10,
      flexDirection: 'column',
    },
    label: {
      marginBottom: 12,
    },
    ctaWrapper: {
      marginTop: 20,
    },
    footer: {
      marginVertical: 40,
      alignItems: 'center',
    },
    goBack: {
      marginVertical: 14,
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
  });
};

export default styleSheet;
