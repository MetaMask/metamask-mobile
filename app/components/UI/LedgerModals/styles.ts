/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';
import { Colors } from '../../../util/theme/models';

export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    modal: {
      justifyContent: 'flex-end',
      margin: 0,
      height: 600,
    },
    contentWrapper: {
      paddingBottom: 32,
      borderRadius: 20,
      backgroundColor: colors.background.default,
    },
  });
