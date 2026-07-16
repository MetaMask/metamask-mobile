import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    summaryContainer: {
      paddingTop: 16,
      paddingBottom: 16,
      gap: 4,
    },
    paddingHorizontal: {
      paddingHorizontal: 16,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 4,
    },
    summaryLabel: {
      flex: 1,
    },
    summaryValue: {
      flexShrink: 0,
      alignItems: 'flex-end',
    },
    inclusiveFeeRow: {
      flexDirection: 'row',
      gap: 4,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });

export default styleSheet;
