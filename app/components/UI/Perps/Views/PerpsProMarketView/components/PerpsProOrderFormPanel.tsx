import { Box } from '@metamask/design-system-react-native';
import React from 'react';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';

/**
 * Pro-mode order form column placeholder (left column).
 *
 * Scaffold only: empty container sized to the Figma order-form column. The
 * inline order-form capability populates this slot.
 */
const PerpsProOrderFormPanel = () => (
  <Box
    testID={PerpsProMarketViewSelectorsIDs.ORDER_FORM_PANEL}
    twClassName="flex-1 py-4"
  >
    <Box twClassName="flex-1 rounded-xl bg-muted" />
  </Box>
);

export default PerpsProOrderFormPanel;
