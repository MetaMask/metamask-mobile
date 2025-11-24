import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      gap: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    statsRowsContainer: {
      backgroundColor: params.theme.colors.background.alternative,
      borderRadius: 8,
      padding: 16,
    },
    statsRow: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: params.theme.colors.border.muted,
    },
    statsRowLast: {
      paddingVertical: 12,
    },
    fundingRateContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    fundingCountdown: {
      marginLeft: 2,
    },
    labelWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
  });

export default styleSheet;
