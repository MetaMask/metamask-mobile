import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      paddingVertical: 8,
    },
    networkContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    },
  });

export default styleSheet;
