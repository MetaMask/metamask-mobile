import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      gap: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
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
