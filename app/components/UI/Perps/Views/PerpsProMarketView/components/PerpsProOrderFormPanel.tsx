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
 * Pro-mode order form column placeholder (left column).
 *
 * Scaffold only: empty container sized to the Figma order-form column. Real
 * form pieces/hooks are wired in by TAT-3551.
 */
const PerpsProOrderFormPanel = () => (
  <Box
    testID={PerpsProMarketViewSelectorsIDs.ORDER_FORM_PANEL}
    twClassName="py-4"
  >
    <Box twClassName="rounded-xl bg-muted" style={styles.body} />
  </Box>
);

export default PerpsProOrderFormPanel;
