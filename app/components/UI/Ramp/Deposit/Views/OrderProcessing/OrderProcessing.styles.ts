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
      marginTop: 12,
      marginBottom: 16,
    },
  });

export default styleSheet;
