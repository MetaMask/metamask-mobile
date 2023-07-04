/* eslint-disable import/prefer-default-export */
import { fontStyles } from '../../../../../../styles/common';
import { StyleSheet } from 'react-native';

export const createStyles = (colors: any) =>
  StyleSheet.create({
    setting: {
      marginTop: 50,
    },
    firstSetting: {
      marginTop: 0,
    },
    title: {
      ...fontStyles.normal,
      color: colors.text.default,
      fontSize: 20,
      lineHeight: 20,
      paddingTop: 4,
      marginTop: -4,
    },
    bump: {
      marginBottom: 10,
    },
    desc: {
      ...fontStyles.normal,
      color: colors.text.alternative,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 12,
    },
    learnMore: {
      ...fontStyles.normal,
      color: colors.primary.default,
      fontSize: 14,
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
      padding: 5,
    },
    warningBold: {
      ...fontStyles.bold,
      color: colors.primary.default,
    },
    confirm: {
      marginTop: 18,
      width: '100%',
    },
  });
