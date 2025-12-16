/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';

export const createStyles = () =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    titleContainer: {
      alignItems: 'flex-start',
      flex: 1,
    },
    switch: {
      alignSelf: 'flex-start',
    },
    icon: {
      marginRight: 16,
    },
    accountAvatar: {
      marginRight: 16,
    },
  });
