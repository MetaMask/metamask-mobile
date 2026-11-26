import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Skeleton,
} from '@metamask/design-system-react-native';
import { BridgeTabKey } from './BridgeView.constants';
import { BridgeViewSelectorsIDs } from './BridgeView.testIds';

/**
 * The pager can show these on every off-screen page at once, so the shimmer
 * stays off to keep them free of running animations.
 */
const StaticSkeleton = (props: React.ComponentProps<typeof Skeleton>) => (
  <Skeleton autoPlay={false} {...props} />
);

/**
 * Mirrors a `SwapsInputs` token card: amount and balance on the left, token
 * pill on the right.
 */
const TokenCardSkeleton = () => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    className="bg-section rounded-2xl px-3 py-6"
  >
    <Box className="gap-2">
      <StaticSkeleton height={40} width={140} className="rounded-lg" />
      <StaticSkeleton height={16} width={90} />
    </Box>
    <StaticSkeleton height={40} width={104} className="rounded-full" />
  </Box>
);

const DetailRowSkeleton = ({ labelWidth }: { labelWidth: number }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    justifyContent={BoxJustifyContent.Between}
  >
    <StaticSkeleton height={18} width={labelWidth} />
    <StaticSkeleton height={18} width={72} />
  </Box>
);

const CardBlockSkeleton = ({ height }: { height: number }) => (
  <StaticSkeleton height={height} width="100%" className="rounded-2xl" />
);

const TAB_DETAILS: Record<BridgeTabKey, React.ReactNode> = {
  [BridgeTabKey.Market]: (
    <Box className="gap-3 pt-2">
      <DetailRowSkeleton labelWidth={96} />
      <DetailRowSkeleton labelWidth={120} />
      <DetailRowSkeleton labelWidth={80} />
    </Box>
  ),
  [BridgeTabKey.Limit]: (
    <Box className="gap-4">
      <CardBlockSkeleton height={132} />
      <DetailRowSkeleton labelWidth={88} />
      <DetailRowSkeleton labelWidth={112} />
    </Box>
  ),
  [BridgeTabKey.Recurring]: (
    <Box className="gap-4">
      <CardBlockSkeleton height={96} />
      <DetailRowSkeleton labelWidth={104} />
    </Box>
  ),
};

/**
 * Lightweight stand-in for a Bridge tab page that isn't mounted yet, shown
 * while the pager slides it into view.
 */
const BridgeTabPageSkeleton = ({ tab }: { tab: BridgeTabKey }) => (
  <Box
    className="flex-1 bg-default"
    testID={`${BridgeViewSelectorsIDs.TAB_PAGE_SKELETON}-${tab}`}
    pointerEvents="none"
  >
    <Box className="px-4 py-3 gap-1">
      <TokenCardSkeleton />
      <TokenCardSkeleton />
    </Box>
    <Box className="px-4">{TAB_DETAILS[tab]}</Box>
  </Box>
);

export default React.memo(BridgeTabPageSkeleton);
