import { StyleSheet } from 'react-native';
import { scale } from 'react-native-size-matters';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';

const createStyles = (colors: any) =>
  StyleSheet.create({
    mainWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    wrapper: {
      flex: 1,
      paddingHorizontal: 32,
    },
    title: {
      fontSize: Device.isAndroid() ? 20 : 25,
      marginTop: 20,
      marginBottom: 20,
      color: colors.text.default,
      justifyContent: 'center',
      textAlign: 'center',
      ...fontStyles.bold,
    },
    field: {
      marginVertical: 5,
      position: 'relative',
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    fieldCol: {
      width: '70%',
    },
    fieldColRight: {
      flexDirection: 'row-reverse',
      width: '30%',
    },
    label: {
      color: colors.text.default,
      fontSize: 16,
      marginBottom: 12,
      ...fontStyles.normal,
    },
    ctaWrapper: {
      marginTop: 20,
    },
    errorMsg: {
      color: colors.error.default,
      textAlign: 'center',
      ...fontStyles.normal,
    },
    seedPhrase: {
      marginBottom: 10,
      paddingTop: 20,
      paddingBottom: 20,
      paddingHorizontal: 20,
      fontSize: 20,
      borderRadius: 10,
      minHeight: 110,
      height: 'auto',
      borderWidth: 1,
      borderColor: colors.border.default,
      backgroundColor: colors.background.default,
      ...fontStyles.normal,
      color: colors.text.default,
    },
    padding: {
      paddingRight: 46,
    },
    biometrics: {
      alignItems: 'flex-start',
      marginTop: 10,
    },
    biometryLabel: {
      flex: 1,
      fontSize: 16,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    biometrySwitch: {
      marginTop: 10,
      flex: 0,
    },
    termsAndConditions: {
      paddingVertical: 10,
    },
    passwordStrengthLabel: {
      height: 20,
      fontSize: scale(10),
      color: colors.text.default,
      ...fontStyles.normal,
    },
    // eslint-disable-next-line react-native/no-unused-styles
    strength_weak: {
      color: colors.error.default,
    },
    // eslint-disable-next-line react-native/no-unused-styles
    strength_good: {
      color: colors.primary.default,
    },
    // eslint-disable-next-line react-native/no-unused-styles
    strength_strong: {
      color: colors.success.default,
    },
    showMatchingPasswords: {
      position: 'absolute',
      top: 52,
      right: 17,
      alignSelf: 'flex-end',
    },
    qrCode: {
      marginRight: 10,
      borderWidth: 1,
      borderRadius: 6,
      borderColor: colors.text.muted,
      paddingVertical: 4,
      paddingHorizontal: 6,
      marginTop: -50,
      marginBottom: 30,
      alignSelf: 'flex-end',
    },
    inputFocused: {
      borderColor: colors.primary.default,
      borderWidth: 2,
    },
    input: {
      ...fontStyles.normal,
      fontSize: 16,
      paddingTop: 2,
      color: colors.text.default,
    },
  });

export default createStyles;
