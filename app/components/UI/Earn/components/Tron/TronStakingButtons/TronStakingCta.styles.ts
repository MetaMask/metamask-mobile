import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      marginTop: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginTop: 4,
      marginBottom: 8,
    },
  });

export default styleSheet;
