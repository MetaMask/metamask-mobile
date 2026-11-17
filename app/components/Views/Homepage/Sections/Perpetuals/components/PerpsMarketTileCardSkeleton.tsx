import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Skeleton,
} from '@metamask/design-system-react-native';

const CARD_WIDTH = 188;
const CARD_HEIGHT = 188;
const TOKEN_LOGO_SIZE = 32;
const SPARKLINE_HEIGHT = 86;
const SKELETON_CARD_COUNT = 3;

const PerpsMarketTileCardSkeleton: React.FC = () => (
  <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2.5">
    {Array.from({ length: SKELETON_CARD_COUNT }, (_, i) => (
      <Box
        key={i}
        twClassName={`w-[${CARD_WIDTH}px] h-[${CARD_HEIGHT}px] bg-muted rounded-xl p-4 justify-between`}
        testID="perps-market-tile-card-skeleton"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          gap={2}
        >
          <Skeleton
            width={TOKEN_LOGO_SIZE}
            height={TOKEN_LOGO_SIZE}
            twClassName="rounded-full"
          />
          <Box twClassName="flex-1 gap-1">
            <Skeleton height={20} width="60%" twClassName="rounded-md" />
            <Skeleton height={18} width="85%" twClassName="rounded-md" />
          </Box>
        </Box>
        <Skeleton height={SPARKLINE_HEIGHT} twClassName="rounded-md" />
      </Box>
    ))}
  </Box>
);

export default React.memo(PerpsMarketTileCardSkeleton);
