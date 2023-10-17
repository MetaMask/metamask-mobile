/* eslint-disable import/prefer-default-export */
import { fontStyles } from '../../../styles/common';
import { StyleSheet } from 'react-native';

export const createStyles = (colors: any) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    container: {
      position: 'relative',
      marginTop: 20,
      marginBottom: 30,
    },
    label: {
      flex: 1,
      fontSize: 16,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    switch: {
      position: 'absolute',
      top: 0,
      right: 0,
    },
  });
