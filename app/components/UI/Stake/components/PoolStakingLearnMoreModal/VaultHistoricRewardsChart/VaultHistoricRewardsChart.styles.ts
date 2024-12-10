import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    chartContainer: {
      flexDirection: 'column',
      justifyContent: 'flex-start',
      paddingVertical: 16,
    },
    chart: {
      height: 112,
      // paddingHorizontal: 8,
    },
    earningRate: {
      paddingVertical: 16,
      gap: 4,
      alignItems: 'center',
    },
  });

export default styleSheet;
