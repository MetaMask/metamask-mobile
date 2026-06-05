import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    body: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 16,
    },
    spinner: {
      marginBottom: 8,
    },
    text: {
      textAlign: 'center',
    },
    cancelRow: {
      paddingTop: 12,
    },
  });

export default styleSheet;
