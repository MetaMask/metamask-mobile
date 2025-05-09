import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 6,
      gap: 16,
    },
    button: {
      flex: 1,
    },
  });

export default styleSheet;
