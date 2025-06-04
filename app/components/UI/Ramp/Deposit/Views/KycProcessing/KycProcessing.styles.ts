import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    heading: {
      textAlign: 'center',
      marginTop: 22,
      marginBottom: 16,
    },
    description: {
      textAlign: 'center',
    },
  });

export default styleSheet;
