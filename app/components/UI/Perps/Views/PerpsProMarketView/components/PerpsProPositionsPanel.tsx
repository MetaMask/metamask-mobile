import { Box } from '@metamask/design-system-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';

const styles = StyleSheet.create({
  body: {
    minHeight: 200,
  },
});

/**
 * Pro-mode positions/orders section placeholder.
 *
 * Scaffold only: empty container matching the Figma tabs/filter/summary/list
 * area. No ticket currently scopes its content.
 */
const PerpsProPositionsPanel = () => (
  <Box
    testID={PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL}
    twClassName="px-4 py-3"
  >
    <Box twClassName="rounded-xl bg-muted" style={styles.body} />
  </Box>
);

export default PerpsProPositionsPanel;
