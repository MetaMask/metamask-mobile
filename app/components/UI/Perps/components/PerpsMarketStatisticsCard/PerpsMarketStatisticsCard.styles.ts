import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    statisticsGrid: {
      gap: 24,
    },
    statisticsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statisticsItem: {
      flex: 1,
      borderRadius: 8,
    },
    statisticsLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    fundingRateContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    fundingCountdown: {
      marginLeft: 2,
    },
    tutorialCardContainer: {
      marginTop: 24,
    },
  });

export default styleSheet;
