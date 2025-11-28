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
      gap: 8,
    },
    statsRowsContainer: {
      gap: 1,
    },
    statsRow: {
      padding: 12,
      backgroundColor: params.theme.colors.background.section,
    },
    statsRowFirst: {
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
    },
    statsRowLast: {
      padding: 12,
      backgroundColor: params.theme.colors.background.section,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
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
    dexTag: {
      backgroundColor: params.theme.colors.background.default,
      borderWidth: 1,
      borderColor: params.theme.colors.border.default,
    },
    orderBookRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      backgroundColor: params.theme.colors.background.section,
    },
    orderBookRowContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });

export default styleSheet;
