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
  /**
   * Optional right-aligned accessory rendered on the same 76px row as the
   * price (per Figma "Chart Compact"). Used for the collapsed-chart expand
   * action so no extra row is introduced below the summary.
   */
  endAccessory?: React.ReactNode;
}

/**
 * Scroll-contained live market price and 24-hour change.
 */
const PerpsProMarketSummary = ({
  symbol,
  currentPrice,
  endAccessory,
}: PerpsProMarketSummaryProps) => (
  <Box
    testID={PerpsProMarketViewSelectorsIDs.MARKET_SUMMARY}
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="h-[76px] gap-4 px-4"
  >
    <Box twClassName="h-full flex-1 justify-start py-1">
      <LivePriceHeader
        symbol={symbol}
        currentPrice={currentPrice}
        size="large"
        testIDPrice={PerpsProMarketViewSelectorsIDs.MARKET_PRICE}
        testIDChange={PerpsProMarketViewSelectorsIDs.MARKET_PRICE_CHANGE}
      />
    </Box>
    {endAccessory}
  </Box>
);

export default PerpsProMarketSummary;
