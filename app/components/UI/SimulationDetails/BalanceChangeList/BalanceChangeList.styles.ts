import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flexDirection: 'column',
      gap: 16,
    },
    totalFiatDisplayContainer: {
      flexDirection: 'row-reverse',
    },
  });

export default styleSheet;
