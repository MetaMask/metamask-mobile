import { StyleSheet, TextStyle } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    wrapper: {
      paddingHorizontal: 16,
    },
    title: {
      paddingVertical: 8,
    } as TextStyle,
  });

export default styleSheet;
