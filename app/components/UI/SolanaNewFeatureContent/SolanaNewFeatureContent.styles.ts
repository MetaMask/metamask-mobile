import { StyleSheet } from 'react-native';
import Device from '../../../util/device';
import { fontStyles, colors as importedColors } from '../../../styles/common';

const createStyles = (colors: {
  background: { default: string };
  text: { default: string };
  primary: { default: string };
  border: { muted: string };
}) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
    },
    wrapper: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 30,
    },
    foxWrapper: {
      width: Device.isLargeDevice() ? 200 : 175,
      height: Device.isLargeDevice() ? 200 : 175,
      marginVertical: 20,
    },
    image: {
      alignSelf: 'center',
      width: Device.isLargeDevice() ? 280 : 220,
      height: Device.isLargeDevice() ? 280 : 220,
    },
    largeFoxWrapper: {
      alignItems: 'center',
      paddingTop: Device.isLargeDevice() ? 60 : 40,
      paddingBottom: Device.isLargeDevice() ? 100 : 40,
    },
    foxImage: {
      width: 145,
      height: 145,
      resizeMode: 'contain',
    },
    title: {
      fontSize: 50,
      lineHeight: 50,
      justifyContent: 'center',
      textAlign: 'center',
      paddingHorizontal: 60,
      paddingTop: 20,
      fontFamily: 'MMPoly-Regular',
      fontWeight: '900',
    },
    titleDescription: {
      paddingTop: 10,
      textAlign: 'center',
      fontSize: 16,
      fontFamily: 'MMSans-Regular',
    },
    ctas: {
      flex: 1,
      position: 'relative',
      width: '100%',
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    footer: {
      marginTop: -40,
      marginBottom: 40,
    },
    login: {
      fontSize: 18,
      color: colors.primary.default,
      ...fontStyles.normal,
    },
    buttonDescription: {
      textAlign: 'center',
      marginBottom: 16,
    },
    importWrapper: {
      marginVertical: 16,
    },
    createWrapper: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'flex-end',
      rowGap: 16,
      marginBottom: 16,
    },
    buttonWrapper: {
      flexDirection: 'column',
      justifyContent: 'flex-end',
      gap: 16,
      width: '100%',
    },
    learnMoreButton: {
      textDecorationLine: 'underline',
      fontFamily: 'MMSans-Regular',
      color: importedColors.gettingStartedTextColor,
      textAlign: 'center',
      paddingTop: 10,
    },
    buttonLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8,
    },
    loader: {
      marginTop: 180,
      justifyContent: 'center',
      textAlign: 'center',
    },
    loadingText: {
      marginTop: 30,
      textAlign: 'center',
    },
    modalTypeView: {
      position: 'absolute',
      bottom: 0,
      paddingBottom: Device.isIphoneX() ? 20 : 10,
      left: 0,
      right: 0,
      backgroundColor: importedColors.transparent,
    },
    notificationContainer: {
      flex: 0.1,
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border.muted,
    },
    bottomSheetContainer: {
      padding: 16,
      flexDirection: 'column',
      rowGap: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    socialBtn: {
      borderColor: colors.border.muted,
      borderWidth: 1,
      color: colors.text.default,
    },
    createWalletButton: {
      borderRadius: 12,
      backgroundColor: importedColors.gettingStartedTextColor,
    },
    existingWalletButton: {
      borderRadius: 12,
      backgroundColor: importedColors.transparent,
      borderWidth: 1,
      borderColor: importedColors.transparent,
    },
  });

export default createStyles;
