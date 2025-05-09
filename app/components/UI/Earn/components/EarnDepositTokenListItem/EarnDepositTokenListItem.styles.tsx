import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    right: {
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
  });

export default styleSheet;
