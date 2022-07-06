/* eslint-disable import/prefer-default-export */
import { fontStyles } from '../../../styles/common';
import { StyleSheet } from 'react-native';
import Device from '../../../util/device';

const breakPoint = Device.getDeviceHeight() < 700;

export const createStyles = (colors: any) =>
  StyleSheet.create({
    areYouSure: {
      width: '100%',
      padding: breakPoint ? 16 : 24,
      justifyContent: 'center',
      alignSelf: 'center',
    },
    textStyle: {
      paddingVertical: 12,
      textAlign: 'center',
    },
    bold: {
      ...fontStyles.bold,
    },
    input: {
      ...fontStyles.normal,
      fontSize: 16,
      color: colors.text.default,
    },
  });
