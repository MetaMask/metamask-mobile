import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

/**
 * Styles for the Pro-mode horizontally scrollable stats bar.
 *
 * Matches Figma node 10041:12992 ("Stats"): each item is an inline
 * label+value pair (not stacked), laid out in a single scrollable row.
 */
export const createStyles = (_params: { theme: Theme }) =>
  StyleSheet.create({
    scrollContent: {
      alignItems: 'center',
    },
  });
