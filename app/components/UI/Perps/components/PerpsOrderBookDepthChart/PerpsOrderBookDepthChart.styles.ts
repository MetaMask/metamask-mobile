import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      width: '100%',
      backgroundColor: params.theme.colors.background.default,
      borderRadius: 8,
      overflow: 'hidden',
    },
    chartContainer: {
      position: 'relative',
      backgroundColor: params.theme.colors.background.default,
    },
    labelContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    legendContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 24,
      paddingBottom: 8,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    bidDot: {
      backgroundColor: params.theme.colors.success.default,
    },
    askDot: {
      backgroundColor: params.theme.colors.error.default,
    },
  });

export default styleSheet;
