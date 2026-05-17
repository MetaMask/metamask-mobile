import React from 'react';
import { Box, Skeleton } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { MarketInsightsSelectorsIDs } from '../../MarketInsights.testIds';

/**
 * Loading skeleton for MarketInsightsEntryCard.
 * Mirrors the card's layout: title row, two body lines, footer line.
 */
const MarketInsightsEntryCardSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box
      twClassName="px-4 mt-2 mb-4"
      testID={MarketInsightsSelectorsIDs.ENTRY_CARD_SKELETON}
    >
      <Box twClassName="bg-background-muted rounded-xl" padding={4} gap={1}>
        {/* Title row: mirrors "Market insights >" */}
        <Skeleton style={tw.style('h-[22px] w-[130px] rounded-md')} />

        {/* Body: two text lines */}
        <Box gap={1}>
          <Skeleton style={tw.style('h-[22px] w-full rounded-md')} />
          <Skeleton style={tw.style('h-[22px] w-4/5 rounded-md')} />
        </Box>

        {/* Footer: mirrors sparkle icon + disclaimer text */}
        <Skeleton style={tw.style('h-[22px] w-[220px] rounded-md')} />
      </Box>
    </Box>
  );
};

export default MarketInsightsEntryCardSkeleton;
