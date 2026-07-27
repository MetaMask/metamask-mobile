import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

/**
 * Styles for the Pro-mode horizontally scrollable stats bar.
 *
 * The stats bar reuses KeyValueColumn items laid out in a horizontal row so
 * the funding rate, 24h volume, open interest and 24h high/low can overflow
 * off-screen and be scrolled instead of wrapping vertically.
 */
export const createStyles = (_params: { theme: Theme }) =>
  StyleSheet.create({
    scrollContent: {
      // Keep the items top-aligned so labels and values stack cleanly even if
      // one item (funding rate + countdown) is taller than the rest.
      alignItems: 'flex-start',
    },
    item: {
      // Give short items (e.g. "24h low") breathing room; wide values expand
      // to their content since the row lives inside a horizontal ScrollView.
      minWidth: 88,
    },
    fundingValue: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
  });
