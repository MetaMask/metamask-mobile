import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Skeleton,
} from '@metamask/design-system-react-native';
import { HomepagePerpsSelectorsIDs } from '../../../Homepage.testIds';

const CARD_WIDTH = 188;
const CARD_HEIGHT = 188;
const TOKEN_LOGO_SIZE = 32;
const SPARKLINE_HEIGHT = 86;
const SKELETON_CARD_COUNT = 3;

const PerpsMarketTileCardSkeleton: React.FC = () => (
  <Box flexDirection={BoxFlexDirection.Row} className="gap-2.5">
    {Array.from({ length: SKELETON_CARD_COUNT }, (_, i) => (
      <Box
        key={i}
        className={`w-[${CARD_WIDTH}px] h-[${CARD_HEIGHT}px] bg-muted rounded-xl p-4 justify-between`}
        testID={HomepagePerpsSelectorsIDs.MARKET_TILE_CARD_SKELETON}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          gap={2}
        >
          <Skeleton
            width={TOKEN_LOGO_SIZE}
            height={TOKEN_LOGO_SIZE}
            className="rounded-full"
          />
          <Box className="flex-1 gap-1">
            <Skeleton height={20} width="60%" className="rounded-md" />
            <Skeleton height={18} width="85%" className="rounded-md" />
          </Box>
        </Box>
        <Skeleton height={SPARKLINE_HEIGHT} className="rounded-md" />
      </Box>
    ))}
  </Box>
);

export default React.memo(PerpsMarketTileCardSkeleton);
