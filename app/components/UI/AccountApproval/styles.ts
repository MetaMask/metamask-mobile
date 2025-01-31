import { StyleSheet } from 'react-native';
import Device from '../../../util/device';
import type { ThemeColors, ThemeTypography } from '@metamask/design-tokens';

const createStyles = (colors: ThemeColors, typography: ThemeTypography) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      paddingTop: 24,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      minHeight: 200,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
    },
    accountCardWrapper: {
      paddingHorizontal: 24,
    },
    intro: {
      ...typography.sHeadingMD,
      textAlign: 'center',
      color: colors.text.default,
      marginBottom: 8,
      marginTop: 16,
    },
    intro_reconnect: {
      ...typography.sHeadingMD,
      textAlign: 'center',
      color: colors.text.default,
      marginBottom: 8,
      marginTop: 16,
      marginLeft: 16,
      marginRight: 16,
    },
    otpContainer: {},
    selectOtp: {
      marginTop: 0,
      padding: 2,
      marginLeft: 20,
      marginRight: 20,
    },
    warning: {
      ...typography.sHeadingSMRegular,
      color: colors.text.default,
      paddingHorizontal: 24,
      marginBottom: 16,
      width: '100%',
      textAlign: 'center',
    },
    actionContainer: {
      flex: 0,
      flexDirection: 'row',
      paddingVertical: 16,
      paddingHorizontal: 24,
    },
    button: {
      flex: 1,
    },
    warningButton: {
      backgroundColor: colors.error.default,
    },
    bottom: {
      marginHorizontal: 24,
    },
    cancel: {
      marginRight: 8,
    },
    confirm: {
      marginLeft: 8,
    },
    circle: {
      width: 16,
      height: 16,
      borderRadius: 16 / 2,
      backgroundColor: colors.background.default,
      opacity: 1,
      margin: 2,
      borderWidth: 2,
      borderColor: colors.border.default,
      marginRight: 6,
    },
    rememberme: {
      marginTop: 15,
      marginBottom: 10,
      flexDirection: 'row',
      justifyContent: 'flex-start',
      marginLeft: 20,
      alignItems: 'center',
    },
    rememberCheckbox: {
      height: 20,
      width: 20,
    },
    rememberText: { paddingLeft: 10, color: colors.text.default },
    option: {
      flex: 1,
    },
    touchableOption: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border.muted,
      borderRadius: 8,
      padding: 16,
      marginLeft: 20,
      marginRight: 20,
      marginTop: 16,
    },
    selectedOption: {
      borderColor: colors.primary.default,
    },
    optionText: {
      ...typography.lBodyMD,
      color: colors.text.default,
      marginHorizontal: 1,
    },
    selectedCircle: {
      width: 12,
      height: 12,
      borderRadius: 12 / 2,
      backgroundColor: colors.primary.default,
      opacity: 1,
      margin: 2,
      marginRight: 6,
    },
    attributionItem: {
      marginRight: 4,
    },
    detailsItem: {
      marginBottom: 4,
    },
    details: { marginLeft: 10 },
    securityTickIcon: { marginTop: 4 },
    descriptionText: {
      paddingRight: 10,
      paddingTop: 3,
      lineHeight: 22,
    },
    advisoryContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 8,
    },
    advisoryText: {
      width: '80%',
    },
    seeDetails: {
      marginTop: 8,
    },
    headerText: {
      marginTop: 3,
    },
  });

export default createStyles;
