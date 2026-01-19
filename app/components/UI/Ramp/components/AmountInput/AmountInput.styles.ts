import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    content: {
      flex: 1,
    },
    centerGroup: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      flex: 1,
    },
    mainAmount: {
      textAlign: 'center',
      fontSize: 64,
      lineHeight: 64 + 8,
      fontWeight: '400',
    },
    amountContainer: {
      alignItems: 'center',
      gap: 16,
    },
  });

export default styleSheet;
