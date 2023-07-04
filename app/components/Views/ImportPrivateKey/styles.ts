/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';

const createStyles = (colors: any) =>
  StyleSheet.create({
    mainWrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    topOverlay: {
      flex: 1,
      backgroundColor: colors.primary.muted,
    },
    wrapper: {
      flexGrow: 1,
    },
    content: {
      alignItems: 'flex-start',
    },
    title: {
      fontSize: 32,
      marginTop: 20,
      marginBottom: 40,
      color: colors.text.default,
      justifyContent: 'center',
      textAlign: 'left',
      ...fontStyles.normal,
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
    scanPkeyRow: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
    },
    scanPkeyText: {
      fontSize: 14,
      color: colors.primary.default,
    },
    icon: {
      textAlign: 'left',
      fontSize: 50,
      marginTop: 0,
      marginLeft: 0,
      color: colors.icon.alternative,
    },
    buttonWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
      padding: 20,
      backgroundColor: colors.background.default,
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
    input: {
      marginTop: 20,
      marginBottom: 10,
      backgroundColor: colors.background.default,
      paddingTop: 20,
      paddingBottom: 20,
      paddingLeft: 20,
      paddingRight: 20,
      fontSize: 15,
      borderRadius: 4,
      height: 120,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.default,
      ...fontStyles.normal,
      color: colors.text.default,
    },
    navbarRightButton: {
      alignSelf: 'flex-end',
      paddingHorizontal: 22,
      paddingTop: 20,
      paddingBottom: 10,
      marginTop: Device.isIphoneX() ? 40 : 20,
    },
    closeIcon: {
      fontSize: 28,
      color: colors.text.default,
    },
  });

export { createStyles };
