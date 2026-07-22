import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';

const styles = StyleSheet.create({
  row: {
    height: 36,
  },
});

/**
 * Pro-mode stats bar placeholder (funding, 24h vol, open interest, prices).
 *
 * Scaffold only: empty row with the Figma top/bottom borders. Real stat values
 * are added by a later Pro-mode ticket.
 */
const PerpsProStatsBar = () => (
  <Box
    testID={PerpsProMarketViewSelectorsIDs.STATS_BAR}
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="px-4 py-2 gap-4 border-t border-b border-border-muted"
  >
    <Box twClassName="flex-1 rounded-lg bg-muted" style={styles.row} />
  </Box>
);

export default PerpsProStatsBar;
