/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';

export const createStyles = () =>
  StyleSheet.create({
    container: {
      width: '100%',
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      flex: 1,
    },
    desc: {
      marginTop: 8,
    },
    switchElement: {
      marginLeft: 16,
    },
    switch: {
      alignSelf: 'flex-start',
    },
  });
