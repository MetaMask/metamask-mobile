/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createStyles = (colors: any) =>
  StyleSheet.create({
    snapCell: {
      borderWidth: 0,
    },
    arrowContainer: { justifyContent: 'center', flex: 1 },
  });
