import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export const TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS = {
  CONTAINER: 'trading-activity-list-skeleton',
  ROW: 'trading-activity-list-skeleton-row',
} as const;

/** Avatar is 40px and each row is separated by a 16px gap. */
const ROW_HEIGHT = 40;
const ROW_GAP = 16;

export interface TradingActivityListSkeletonProps {
  /** Draw this many rows. Used by the Performance preview. */
  rows?: number;
  /**
   * Fill this height with as many rows as fit. The commissions and rebates
   * screens pass the body height under the header. Measuring the skeleton
   * itself cannot do this: once rows render, that measurement is the rows.
   */
  height?: number;
}

function rowsForHeight(height: number): number {
  if (height <= 0) {
    return 0;
  }
  return Math.max(1, Math.floor((height + ROW_GAP) / (ROW_HEIGHT + ROW_GAP)));
}

/**
 * Placeholder rows for a commissions or rebates list. Matches the avatar,
 * two-line label, and amount of an activity row.
 */
const TradingActivityListSkeleton: React.FC<
  TradingActivityListSkeletonProps
> = ({ rows, height = 0 }) => {
  const tw = useTailwind();
  const rowCount = rows ?? rowsForHeight(height);

  return (
    <Box
      twClassName="gap-4 overflow-hidden"
      style={rows === undefined && height > 0 ? { height } : undefined}
      testID={TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS.CONTAINER}
    >
      {Array.from({ length: rowCount }, (_, index) => (
        <Box
          key={index}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-3"
          testID={TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS.ROW}
        >
          <Skeleton style={tw.style('h-10 w-10 rounded-full')} />
          <Box twClassName="flex-1 gap-2">
            <Skeleton style={tw.style('h-4 w-24 rounded-md')} />
            <Skeleton style={tw.style('h-3 w-16 rounded-md')} />
          </Box>
          <Box twClassName="items-end gap-2">
            <Skeleton style={tw.style('h-4 w-16 rounded-md')} />
            <Skeleton style={tw.style('h-3 w-12 rounded-md')} />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default TradingActivityListSkeleton;
