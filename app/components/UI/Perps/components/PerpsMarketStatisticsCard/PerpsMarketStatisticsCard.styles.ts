import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    statisticsGrid: {
      gap: 12,
      marginVertical: 6,
    },
    statisticsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    statisticsItem: {
      flex: 1,
      backgroundColor: theme.colors.background.muted,
      padding: 16,
      borderRadius: 8,
    },
    statisticsLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4,
    },
    statisticsValue: {
      fontSize: 16,
      fontWeight: '600',
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
