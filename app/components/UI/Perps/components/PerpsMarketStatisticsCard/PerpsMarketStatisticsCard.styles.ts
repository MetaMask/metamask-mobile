import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    statisticsGrid: {
      gap: 12,
    },
    statisticsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statisticsItem: {
      flex: 1,
    },
    orderBookButton: {
      marginTop: 12,
    },
    fundingRateContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    fundingCountdown: {
      marginLeft: 2,
    },
  });

export default styleSheet;
