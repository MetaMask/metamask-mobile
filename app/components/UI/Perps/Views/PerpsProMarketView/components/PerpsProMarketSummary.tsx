import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';

const styles = StyleSheet.create({
  container: {
    height: 76,
  },
});

/**
 * Scroll-contained market price and 24-hour change placeholder.
 *
 * The fixed app header remains outside the scroll view. Price content and the
 * compact chart action are populated by the panel implementation that owns
 * live market data.
 */
const PerpsProMarketSummary = () => (
  <Box
    testID={PerpsProMarketViewSelectorsIDs.MARKET_SUMMARY}
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="px-4"
    style={styles.container}
  >
    <Box twClassName="h-12 w-40 rounded-lg bg-muted" />
    <Box twClassName="h-8 w-8 rounded-full bg-muted" />
  </Box>
);

export default PerpsProMarketSummary;
