import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    balanceButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    balanceActionButton: {
      flex: 1,
    },
  });

export default styleSheet;
