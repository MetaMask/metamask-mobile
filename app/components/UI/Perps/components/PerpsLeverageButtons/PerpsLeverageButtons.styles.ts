import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

export const createStyles = (_colors: Colors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: 8,
    },
    leverageButton: {
      minWidth: 60,
    },
  });
