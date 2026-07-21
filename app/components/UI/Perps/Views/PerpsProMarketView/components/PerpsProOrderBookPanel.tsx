import { Box } from '@metamask/design-system-react-native';
import React from 'react';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';

/**
 * Pro-mode order book column placeholder (right column).
 *
 * Scaffold only: empty container sized to fill the fixed-width column. The
 * inline order-book capability populates this slot.
 */
const PerpsProOrderBookPanel = () => (
  <Box
    testID={PerpsProMarketViewSelectorsIDs.ORDER_BOOK_PANEL}
    twClassName="flex-1 py-4"
  >
    <Box twClassName="flex-1 rounded-xl bg-muted" />
  </Box>
);

export default PerpsProOrderBookPanel;
