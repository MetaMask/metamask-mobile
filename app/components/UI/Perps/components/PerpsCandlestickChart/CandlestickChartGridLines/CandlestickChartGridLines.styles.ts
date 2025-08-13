import { StyleSheet } from 'react-native';

export const styleSheet = () =>
  StyleSheet.create({
    gridContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: -1, // Hide grid lines behind the candles
      pointerEvents: 'none',
    },
    gridPriceLabel: {
      position: 'absolute',
      right: 0,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      zIndex: 10,
    },
  });
