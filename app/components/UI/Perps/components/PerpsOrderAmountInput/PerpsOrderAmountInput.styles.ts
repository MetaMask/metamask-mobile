import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

export const createStyles = (_colors: Colors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 24,
    },
    amountDisplay: {
      fontSize: 48,
      fontWeight: '700',
    },
    cryptoAmount: {
      marginTop: 8,
    },
  });
