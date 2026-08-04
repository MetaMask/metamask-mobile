import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import React from 'react';
import type { LayoutChangeEvent } from 'react-native';
import LivePriceHeader from '../LivePriceDisplay/LivePriceHeader';

export interface PerpsMarketSummaryProps {
  symbol: string;
  currentPrice: number;
  testID: string;
  testIDPrice: string;
  testIDChange: string;
  size?: 'prominent' | 'large';
  endAccessory?: React.ReactNode;
  /** Used by Lite to sync the header scroll crossfade with the measured row height. */
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * Fixed height of the Pro (`prominent`) summary row, in px (keep in sync with
 * the `h-[76px]` class below). The market header uses this as the scroll
 * threshold for its price crossfade.
 */
export const PRICE_SECTION_HEIGHT = 76;

/**
 * Scroll-contained live market price and 24-hour change.
 */
const PerpsMarketSummary = ({
  symbol,
  currentPrice,
  testID,
  testIDPrice,
  testIDChange,
  size = 'prominent',
  endAccessory,
  onLayout,
}: PerpsMarketSummaryProps) => {
  if (size === 'large') {
    // Lite: content-hugging row — DisplayLg needs more vertical space than Pro's
    // fixed 76px summary (HeadingLg). Matches the pre-unification layout.
    return (
      <Box
        testID={testID}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        gap={2}
        twClassName="px-4 py-2"
        onLayout={onLayout}
      >
        <Box twClassName="flex-1">
          <LivePriceHeader
            symbol={symbol}
            currentPrice={currentPrice}
            size="large"
            testIDPrice={testIDPrice}
            testIDChange={testIDChange}
          />
        </Box>
        {endAccessory}
      </Box>
    );
  }

  return (
    <Box
      testID={testID}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="h-[76px] gap-4 px-4"
      onLayout={onLayout}
    >
      <Box twClassName="h-full flex-1 justify-start py-2">
        <LivePriceHeader
          symbol={symbol}
          currentPrice={currentPrice}
          size="prominent"
          testIDPrice={testIDPrice}
          testIDChange={testIDChange}
        />
      </Box>
      {endAccessory}
    </Box>
  );
};

export default PerpsMarketSummary;
