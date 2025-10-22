import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const createStyles = (_colors: Theme['colors']) =>
  StyleSheet.create({
    feeRowContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    feeDiscountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
  });

export { createStyles };
