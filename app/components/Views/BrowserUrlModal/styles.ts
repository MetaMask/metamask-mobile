/* eslint-disable import/prefer-default-export */
import { fontStyles } from '../../../styles/common';
import { StyleSheet } from 'react-native';
import Device from '../../../util/device';

export const createStyles = (colors: any) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    urlModal: {
      justifyContent: 'flex-start',
      margin: 0,
    },
    urlModalContent: {
      flexDirection: 'row',
      paddingTop: Device.isAndroid() ? 10 : Device.isIphoneX() ? 50 : 27,
      paddingHorizontal: 10,
      height: Device.isAndroid() ? 59 : Device.isIphoneX() ? 87 : 65,
      backgroundColor: colors.background.default,
    },
    clearButton: { paddingHorizontal: 12, justifyContent: 'center' },
    urlInput: {
      ...fontStyles.normal,
      fontSize: Device.isAndroid() ? 16 : 14,
      paddingLeft: 15,
      flex: 1,
      color: colors.text.default,
    } as any,
    cancelButton: {
      marginTop: -6,
      marginLeft: 10,
      justifyContent: 'center',
    },
    cancelButtonText: {
      fontSize: 14,
      color: colors.primary.default,
      ...fontStyles.normal,
    } as any,
    searchWrapper: {
      flexDirection: 'row',
      borderRadius: 30,
      backgroundColor: colors.background.alternative,
      height: Device.isAndroid() ? 40 : 30,
      flex: 1,
    },
  });
