import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    // Used for ScrollView when showing all badges
    scrollContainer: {
      flexDirection: 'row',
      paddingVertical: 8,
    },
    scrollContent: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
    },
  });
