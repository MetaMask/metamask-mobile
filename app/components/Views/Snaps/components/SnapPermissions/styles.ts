/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createStyles = (colors: any) =>
  StyleSheet.create({
    section: {
      paddingTop: 32,
    },
    permissionCell: {
      borderRadius: 10,
      borderWidth: 0,
    },
    cellBase: {
      flexDirection: 'row',
    },
    icon: {
      marginTop: 16,
      marginRight: 16,
    },
    cellBaseInfo: {
      flex: 1,
      alignItems: 'flex-start',
    },
    secondaryText: {
      color: colors.text.alternative,
    },
  });
