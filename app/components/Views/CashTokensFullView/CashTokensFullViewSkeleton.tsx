import React from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Skeleton,
} from '@metamask/design-system-react-native';

export const CashTokensFullViewSkeletonTestIds = {
  CONTAINER: 'cash-tokens-full-view-skeleton',
  TOKEN_ROW: 'skeleton-token-row',
  EMPTY_STATE_ROW: 'skeleton-empty-state-row',
};

interface CashTokensFullViewSkeletonProps {
  numChainsWithMusdBalance: number;
  listHeaderComponent?: React.ReactElement;
}

/**
 * Mirrors a single TokenListItem row: 40px avatar circle, two text lines
 * on the left (name + price), two text lines on the right (fiat + balance).
 */
const TokenRowSkeleton = () => (
  <Box
    testID={CashTokensFullViewSkeletonTestIds.TOKEN_ROW}
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="px-4 py-3"
  >
    <Skeleton height={40} width={40} twClassName="rounded-full" />
    <Box twClassName="flex-1 ml-3 gap-1">
      <Skeleton height={16} width={120} />
      <Skeleton height={12} width={80} />
    </Box>
    <Box twClassName="items-end gap-1">
      <Skeleton height={16} width={60} />
      <Skeleton height={12} width={50} />
    </Box>
  </Box>
);

/**
 * Mirrors the empty-state row: large avatar, name + subtitle on
 * the left, a button placeholder on the right.
 */
const EmptyStateRowSkeleton = () => (
  <Box
    testID={CashTokensFullViewSkeletonTestIds.EMPTY_STATE_ROW}
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="px-4 py-1"
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="flex-1 gap-5"
    >
      <Skeleton height={40} width={40} twClassName="rounded-full" />
      <Box twClassName="gap-1">
        <Skeleton height={16} width={100} />
        <Skeleton height={12} width={80} />
      </Box>
    </Box>
    <Skeleton height={36} width={100} twClassName="rounded-lg" />
  </Box>
);

/**
 * Content-area loading skeleton for the Money Hub (CashTokensFullView).
 *
 * Accepts synchronous Redux-derived props so it can mirror the exact layout
 * branch the real content will take: token rows vs empty state.
 */
const CashTokensFullViewSkeleton = ({
  numChainsWithMusdBalance,
  listHeaderComponent,
}: CashTokensFullViewSkeletonProps) => {
  const tw = useTailwind();

  return (
    <ScrollView
      style={tw`flex-1`}
      showsVerticalScrollIndicator={false}
      testID={CashTokensFullViewSkeletonTestIds.CONTAINER}
    >
      {listHeaderComponent}
      {numChainsWithMusdBalance > 0 ? (
        <>
          {Array.from({ length: numChainsWithMusdBalance }, (_, index) => (
            <TokenRowSkeleton key={`token-row-${index}`} />
          ))}
        </>
      ) : (
        <EmptyStateRowSkeleton />
      )}
    </ScrollView>
  );
};

CashTokensFullViewSkeleton.displayName = 'CashTokensFullViewSkeleton';

export default CashTokensFullViewSkeleton;
