import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    content: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 16,
    },
    title: {
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      textAlign: 'center',
      marginBottom: 8,
    },
    footer: {
      paddingTop: 8,
    },
  });

export default styleSheet;
