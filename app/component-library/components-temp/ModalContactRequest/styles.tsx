/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';

export const createStyles = (colors: any) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      padding: 24,
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background.default,
    },
    content: {
      justifyContent: 'center',
      padding: 16,
      flexGrow: 1,
    },
    title: {
      textAlign: 'center',
      paddingBottom: 16,
    },
    description: {
      textAlign: 'center',
    },
    buttonsContainer: {
      flexDirection: 'row',
      padding: 16,
    },
    button: {
      flex: 1,
    },
    buttonDivider: {
      width: 8,
    },
  });
