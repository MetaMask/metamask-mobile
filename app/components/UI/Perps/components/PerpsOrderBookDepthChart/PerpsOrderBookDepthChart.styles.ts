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
    },
    labelContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    midPriceContainer: {
      position: 'absolute',
      left: '50%',
      top: 0,
      bottom: 0,
      width: 1,
      backgroundColor: params.theme.colors.border.default,
    },
    midPriceLabel: {
      position: 'absolute',
      left: '50%',
      top: 8,
      transform: [{ translateX: -30 }],
      backgroundColor: params.theme.colors.background.default,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    legendContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 24,
      paddingVertical: 8,
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
