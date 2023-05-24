/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createStyles = (colors: any) =>
  StyleSheet.create({
    versionBadgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background.alternative,
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 16,
    },
    versionBadgeItem: {
      padding: 2,
    },
  });
