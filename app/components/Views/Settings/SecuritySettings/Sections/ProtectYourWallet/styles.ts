/* eslint-disable import/prefer-default-export */
import { fontStyles } from '../../../../../../styles/common';
import { StyleSheet } from 'react-native';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createStyles = (colors: any) =>
  StyleSheet.create({
    setting: {
      marginTop: 30,
    },
    firstSetting: {
      marginTop: 0,
    },
    desc: {
      marginTop: 8,
    },
    warningText: {
      color: colors.text.default,
      fontSize: 12,
      flex: 1,
      ...fontStyles.normal,
    },
    warningTextRed: {
      color: colors.text.default,
    },
    warningTextGreen: {
      color: colors.text.default,
    },
    viewHint: {
      marginLeft: 4,
    },
    warningBold: {
      ...fontStyles.bold,
      color: colors.primary.default,
    },
    accessory: {
      marginTop: 16,
    },
    video: {
      marginTop: 16,
    },
  });
