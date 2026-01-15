/* eslint-disable import/prefer-default-export */
import { Platform, StyleSheet } from 'react-native';
import { Colors } from '../../../util/theme/models';
import Device from '../../../util/device';

const createStyles = (colors: Colors, isKeyboardVisible = false) =>
  StyleSheet.create({
    mainWrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    wrapper: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'android' ? 0 : 16,
    },
    contentContainer: {
      flex: 1,
    },
    subtitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    buttonWrapper: {
      marginTop: 24,
    },
    button: {
      marginBottom: 0,
    },
    top: {
      paddingTop: 0,
      padding: 30,
    },
    bottom: {
      width: '100%',
      padding: 30,
      backgroundColor: colors.background.default,
    },
    navbarLeftButton: {
      alignSelf: 'flex-start',
      paddingTop: 20,
      paddingBottom: 10,
      marginTop: Device.isIphoneX() ? 40 : 20,
    },
    navbarRightButton: {
      alignSelf: 'flex-end',
      paddingTop: 20,
      paddingBottom: 10,
      marginTop: Device.isIphoneX() ? 40 : 20,
    },
    closeIcon: {
      fontSize: 28,
      color: colors.text.default,
    },
    keyboardStickyView: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    stickyButtonContainer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: isKeyboardVisible ? 6 : 32,
      backgroundColor: colors.background.default,
    },
    stickyErrorText: {
      marginBottom: 8,
    },
  });

export { createStyles };
