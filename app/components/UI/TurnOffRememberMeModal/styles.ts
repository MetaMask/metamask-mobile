/* eslint-disable import/prefer-default-export */
import { fontStyles } from '../../../styles/common';
import { StyleSheet } from 'react-native';

export const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    areYouSure: {
      width: '100%',
      justifyContent: 'center',
      alignSelf: 'center',
      padding: 16,
    },
    textStyle: {
      paddingVertical: 8,
      textAlign: 'center',
    },
    input: {
      ...fontStyles.normal,
      fontSize: 16,
      color: colors.text.default,
    },
  });
