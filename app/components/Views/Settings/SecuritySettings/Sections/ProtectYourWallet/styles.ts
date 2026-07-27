/* eslint-disable import-x/prefer-default-export */
import { fontStyles } from '../../../../../../styles/common';
import { StyleSheet } from 'react-native';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createStyles = (colors: any) =>
  StyleSheet.create({
    setting: {
      marginTop: 0,
      paddingVertical: 16,
    },
    firstSetting: {
      marginTop: 0,
    },
    desc: {
      marginTop: 8,
      lineHeight: 20,
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
    statusRow: {
      alignItems: 'center',
      flexDirection: 'row',
      marginTop: 12,
      minHeight: 32,
    },
    statusIcon: {
      color: colors.success.default,
      marginRight: 8,
    },
    statusText: {
      color: colors.text.default,
      flex: 1,
    },
    warningBold: {
      ...fontStyles.bold,
      color: colors.primary.default,
    },
    accessory: {
      marginTop: 12,
    },
  });
