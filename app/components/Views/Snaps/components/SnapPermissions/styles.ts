/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createStyles = (colors: any) =>
  StyleSheet.create({
    snapSettingsContainer: {
      flex: 1,
      marginHorizontal: 16,
    },
    itemPaddedContainer: {
      paddingVertical: 16,
    },
    removeSection: {
      paddingTop: 32,
    },
    snapCell: {
      borderRadius: 10,
      borderWidth: 0,
    },
    removeButton: {
      marginVertical: 16,
    },
  });
