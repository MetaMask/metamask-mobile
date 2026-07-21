import { Box } from '@metamask/design-system-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';

const styles = StyleSheet.create({
  body: {
    minHeight: 480,
  },
});

/**
 * Pro-mode order book column placeholder (right column).
 *
 * Scaffold only: empty container sized to the Figma order-book column, sized to
 * fill the fixed-width column it is placed in. Real order book content
 * (including the buy/sell ratio bar) is added by TAT-3555.
 */
const PerpsProOrderBookPanel = () => (
  <Box
    testID={PerpsProMarketViewSelectorsIDs.ORDER_BOOK_PANEL}
    twClassName="py-4"
  >
    <Box twClassName="rounded-xl bg-muted" style={styles.body} />
  </Box>
);

export default PerpsProOrderBookPanel;
