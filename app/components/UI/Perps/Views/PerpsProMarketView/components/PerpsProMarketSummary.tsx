import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import React from 'react';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import LivePriceHeader from '../../../components/LivePriceDisplay/LivePriceHeader';

interface PerpsProMarketSummaryProps {
  symbol: string;
  currentPrice: number;
}

/**
 * Scroll-contained live market price and 24-hour change.
 */
const PerpsProMarketSummary = ({
  symbol,
  currentPrice,
}: PerpsProMarketSummaryProps) => (
  <Box
    testID={PerpsProMarketViewSelectorsIDs.MARKET_SUMMARY}
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="h-[76px] px-4"
  >
    <Box twClassName="flex-1">
      <LivePriceHeader
        symbol={symbol}
        currentPrice={currentPrice}
        size="large"
        testIDPrice={PerpsProMarketViewSelectorsIDs.MARKET_PRICE}
        testIDChange={PerpsProMarketViewSelectorsIDs.MARKET_PRICE_CHANGE}
      />
    </Box>
  </Box>
);

export default PerpsProMarketSummary;
