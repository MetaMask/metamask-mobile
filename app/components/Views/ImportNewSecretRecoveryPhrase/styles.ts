/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';
import { Colors } from '../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    mainWrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    wrapper: {
      flexGrow: 1,
      paddingHorizontal: 16,
    },
    headerButton: {
      paddingHorizontal: 16,
    },
    title: {
      marginTop: 0,
      marginBottom: 0,
    },
    contentContainer: {
      marginTop: 6,
    },
    subtitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 16,
    },
    textareaContainer: {
      width: '100%',
      marginBottom: 0,
    },
    textarea: {
      minHeight: 180,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border.muted,
      borderRadius: 8,
      fontSize: 16,
      lineHeight: 24,
      color: colors.text.default,
      backgroundColor: colors.background.default,
      ...fontStyles.normal,
    },
    textareaError: {
      borderColor: colors.error.default,
    },
    errorBanner: {
      marginTop: 16,
    },
    footerText: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 4,
    },
    dataRow: {
      marginBottom: 10,
    },
    label: {
      fontSize: 14,
      color: colors.text.default,
      textAlign: 'left',
      ...fontStyles.normal,
    },
    subtitleText: {
      fontSize: 18,
      ...fontStyles.bold,
      color: colors.text.default,
    },
    icon: {
      textAlign: 'left',
      fontSize: 50,
      marginTop: 0,
      marginLeft: 0,
      color: colors.icon.alternative,
    },
    buttonWrapper: {
      width: '100%',
      marginTop: 24,
    },
    button: {
      marginBottom: Device.isIphoneX() ? 20 : 0,
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
  });

export { createStyles };
