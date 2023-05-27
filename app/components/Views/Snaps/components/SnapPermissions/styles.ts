/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createStyles = (colors: any) =>
  StyleSheet.create({
    section: {
      paddingTop: 32,
    },
    snapCell: {
      borderRadius: 10,
      borderWidth: 0,
    },
  });
