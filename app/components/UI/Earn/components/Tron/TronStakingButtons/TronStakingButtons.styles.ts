import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    buttonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      paddingTop: 16,
      paddingBottom: 16,
    },
    balanceActionButton: {
      flex: 1,
    },
  });

export default styleSheet;
