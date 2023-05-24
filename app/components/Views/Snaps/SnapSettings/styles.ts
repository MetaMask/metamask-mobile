/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createStyles = (colors: any) =>
  StyleSheet.create({
    snapSettingsContainer: {
      flex: 1,
    },
    snapInfoContainer: {
      backgroundColor: colors.background.default,
      borderRadius: 10,
      marginHorizontal: 16,
      borderWidth: 2,
      borderColor: colors.border.default,
    },
    switchElement: {},
    snapCell: {
      borderRadius: 10,
      borderWidth: 0,
    },
    toggleContainer: {
      padding: 16,
      borderTopColor: colors.border.default,
      borderTopWidth: 2,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  });
