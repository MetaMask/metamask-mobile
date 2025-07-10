import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 24,
    },
    priceChange: {
      marginTop: 4,
    },
    marketButton: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginTop: 16,
    },
  });
