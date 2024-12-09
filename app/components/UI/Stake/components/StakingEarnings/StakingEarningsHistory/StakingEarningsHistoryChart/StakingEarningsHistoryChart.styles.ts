import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    stakingEarningsHistoryChart: {
      height: 112,
      flex: 1,
    },
    stakingEarningsHistoryChartHeaderContainer: {
      flex: 1, // Use flex to fill the available space
      justifyContent: 'center', // Center vertically
      alignItems: 'center', // Center horizontally
      paddingTop: 16,
      paddingBottom: 16,
    },
    stakingEarningsHistoryChartContainer: {
      flex: 1,
      width: '100%',
    },
  });

export default styleSheet;
