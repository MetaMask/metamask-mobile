import { StyleSheet, TextStyle } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    wrapper: {
      paddingHorizontal: 16,
    },
    title: {
      paddingTop: 8,
      paddingBottom: 4,
    } as TextStyle,
  });

export default styleSheet;
