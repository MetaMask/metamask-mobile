import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    subtitle: {
      marginBottom: 20,
    },
    label: {
      marginBottom: 6,
    },
    field: {
      flex: 1,
      flexDirection: 'column',
    },
    footerContent: {
      gap: 8,
    },
  });

export default styleSheet;
