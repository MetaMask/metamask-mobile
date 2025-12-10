import { StyleSheet, Platform } from 'react-native';
import Device from '../../../util/device';
import { colors as importedColors } from '../../../styles/common';
import type { Theme } from '../../../util/theme/models';

/**
 * @param colors - Theme colors
 * @returns StyleSheet object
 */
export const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
    },
    wrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
    },
    loaderWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      rowGap: 32,
      marginBottom: 160,
    },
    loaderOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      alignItems: 'center',
      justifyContent: 'center',
    },
    image: {
      alignSelf: 'center',
      width: Device.isMediumDevice() ? 180 : 240,
      height: Device.isMediumDevice() ? 180 : 240,
    },
    largeFoxWrapper: {
      width: Device.isMediumDevice() ? 180 : 240,
      height: Device.isMediumDevice() ? 180 : 240,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 'auto',
      padding: Device.isMediumDevice() ? 30 : 40,
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginLeft: -(Device.isMediumDevice() ? 90 : 120),
      marginTop: -(Device.isMediumDevice() ? 90 : 120),
    },
    foxImage: {
      width: Device.isMediumDevice() ? 110 : 145,
      height: Device.isMediumDevice() ? 110 : 145,
      resizeMode: 'contain',
    },
    title: {
      fontSize: Device.isMediumDevice() ? 30 : 40,
      lineHeight: Device.isMediumDevice() ? 30 : 40,
      textAlign: 'center',
      paddingHorizontal: Device.isMediumDevice() ? 40 : 60,
      fontFamily:
        Platform.OS === 'android' ? 'MM Sans Regular' : 'MMSans-Regular',
      color: importedColors.gettingStartedTextColor,
      width: '100%',
      marginVertical: 16,
    },
    ctas: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 20,
      rowGap: Device.isMediumDevice() ? 16 : 24,
    },
    titleWrapper: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      flex: 1,
      rowGap: Device.isMediumDevice() ? 24 : 32,
    },
    footer: {
      marginBottom: 40,
      marginTop: -40,
    },
    createWrapper: {
      flexDirection: 'column',
      rowGap: Device.isMediumDevice() ? 12 : 16,
      marginBottom: 16,
      position: 'absolute',
      top: '50%',
      left: Device.isMediumDevice() ? 26 : 36,
      right: Device.isMediumDevice() ? 26 : 36,
      marginTop: 180,
      alignItems: 'stretch',
    },
    buttonWrapper: {
      flexDirection: 'column',
      justifyContent: 'flex-end',
      gap: Device.isMediumDevice() ? 12 : 16,
      width: '100%',
    },
    buttonLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8,
    },
    loader: {
      justifyContent: 'center',
      textAlign: 'center',
    },
    loadingText: {
      marginTop: 30,
      textAlign: 'center',
      color: colors.text.default,
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
    blackButton: {
      backgroundColor: importedColors.white,
    },
    inverseBlackButton: {
      backgroundColor: importedColors.applePayBlack,
    },
  });
