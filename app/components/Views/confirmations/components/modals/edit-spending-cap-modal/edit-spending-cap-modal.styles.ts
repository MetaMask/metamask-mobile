import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    buttonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 16,
    },
    button: {
      flex: 1,
    },
    description: {
      marginBottom: 16,
    },
    balanceInfo: {
      marginTop: 16,
      marginBottom: 24,
    },
  });

export default styleSheet;
