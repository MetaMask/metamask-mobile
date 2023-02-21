/* eslint-disable import/prefer-default-export */
import { fontStyles } from '../../../styles/common';
import { StyleSheet } from 'react-native';

export const createStyles = (colors: any) =>
  StyleSheet.create({
    title: {
      ...fontStyles.normal,
      color: colors.text.default,
      fontSize: 20,
      lineHeight: 20,
      paddingTop: 4,
      marginTop: -4,
    },
    desc: {
      ...fontStyles.normal,
      color: colors.text.alternative,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 12,
    },
    switchElement: {
      marginTop: 18,
      alignSelf: 'flex-start',
    },
    setting: {
      marginTop: 50,
    },
    switch: {
      alignSelf: 'flex-start',
    },
  });
