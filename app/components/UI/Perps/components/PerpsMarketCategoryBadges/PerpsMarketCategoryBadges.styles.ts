import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    scrollContent: {
      flexDirection: 'row',
      gap: 8,
    },
  });
