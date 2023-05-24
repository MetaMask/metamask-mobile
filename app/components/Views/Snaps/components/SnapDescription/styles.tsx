/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createStyles = (colors: any) =>
  StyleSheet.create({
    snapInfoContainer: {
      backgroundColor: colors.background.default,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    titleContainer: {
      alignItems: 'center',
      padding: 4,
      flexDirection: 'row',
    },
    iconContainer: {
      paddingHorizontal: 8,
      flexDirection: 'row',
    },
    snapCell: {
      borderRadius: 10,
      borderWidth: 0,
    },
    detailsContainerWithBorder: {
      padding: 16,
      borderColor: colors.border.default,
      borderTopWidth: 1,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  });
