import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const createStyles = (_colors: Theme['colors']) =>
  StyleSheet.create({
    feeRowContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });

export { createStyles };
