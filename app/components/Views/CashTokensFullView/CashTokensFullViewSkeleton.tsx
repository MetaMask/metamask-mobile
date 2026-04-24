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
  BONUS_SECTION: 'skeleton-bonus-section',
  CONVERT_SECTION: 'skeleton-convert-section',
};

interface CashTokensFullViewSkeletonProps {
  numChainsWithMusdBalance: number;
  isMoneyHubEnabled: boolean;
  conversionTokenCount: number;
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
 * Mirrors the CashGetMusdEmptyState row: large avatar, name + subtitle on
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
 * Mirrors AssetOverviewClaimBonus: divider, header row with tag pill,
 * two label + value rows, a full-width CTA button, and a closing divider.
 */
const BonusSectionSkeleton = () => (
  <Box testID={CashTokensFullViewSkeletonTestIds.BONUS_SECTION}>
    <Box twClassName="h-px bg-border-muted my-5" />
    <Box twClassName="px-4">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="py-3"
      >
        <Skeleton height={20} width={120} />
        <Skeleton height={24} width={60} twClassName="rounded-lg" />
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        twClassName="py-2"
      >
        <Skeleton height={16} width={160} />
        <Skeleton height={16} width={60} />
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        twClassName="py-2"
      >
        <Skeleton height={16} width={160} />
        <Skeleton height={16} width={60} />
      </Box>
      <Box twClassName="mt-4 mb-3">
        <Skeleton height={48} width="100%" twClassName="rounded-full" />
      </Box>
    </Box>
    <Box twClassName="h-px bg-border-muted my-5" />
  </Box>
);

/**
 * Mirrors a single ConvertTokenRow: 32px token icon, name + balance text,
 * and action button placeholders on the right.
 */
const ConvertTokenRowSkeleton = () => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="px-4 py-3"
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="flex-1 gap-4"
    >
      <Skeleton height={32} width={32} twClassName="rounded-full" />
      <Box twClassName="gap-1">
        <Skeleton height={16} width={60} />
        <Skeleton height={12} width={80} />
      </Box>
    </Box>
    <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2">
      <Skeleton height={32} width={56} twClassName="rounded-lg" />
      <Skeleton height={32} width={32} twClassName="rounded-xl" />
    </Box>
  </Box>
);

/**
 * Mirrors MoneyConvertStablecoins: heading, description, 2x2 feature tag
 * pills (Dollar-backed, No lockups, No MetaMask fee, Daily bonus),
 * optional convert-token rows, and a learn-more button.
 */
const ConvertSectionSkeleton = ({ tokenCount }: { tokenCount: number }) => (
  <Box
    testID={CashTokensFullViewSkeletonTestIds.CONVERT_SECTION}
    twClassName="pt-3"
  >
    <Box twClassName="px-4">
      <Skeleton height={20} width={160} />
      <Box twClassName="mt-3 gap-1">
        <Skeleton height={14} width="90%" />
        <Skeleton height={14} width="80%" />
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="flex-wrap mt-4 gap-2"
      >
        <Skeleton height={24} width="38%" twClassName="rounded" />
        <Skeleton height={24} width="30%" twClassName="rounded" />
        <Skeleton height={24} width="42%" twClassName="rounded" />
        <Skeleton height={24} width="32%" twClassName="rounded" />
      </Box>
    </Box>
    {tokenCount > 0 && (
      <Box twClassName="mt-3">
        {Array.from({ length: Math.min(tokenCount, 3) }, (_, index) => (
          <ConvertTokenRowSkeleton key={`convert-row-${index}`} />
        ))}
      </Box>
    )}
    <Box twClassName="px-4 mt-3">
      <Skeleton height={48} width="100%" twClassName="rounded-full" />
    </Box>
  </Box>
);

/**
 * Content-area loading skeleton for the Money Hub (CashTokensFullView).
 *
 * Accepts synchronous Redux-derived props so it can mirror the exact layout
 * branch the real content will take: token rows vs empty state, and whether
 * the MoneyHub bonus/convert sections appear.
 */
const CashTokensFullViewSkeleton = ({
  numChainsWithMusdBalance,
  isMoneyHubEnabled,
  conversionTokenCount,
}: CashTokensFullViewSkeletonProps) => {
  const tw = useTailwind();

  return (
    <ScrollView
      style={tw`flex-1`}
      showsVerticalScrollIndicator={false}
      testID={CashTokensFullViewSkeletonTestIds.CONTAINER}
    >
      {numChainsWithMusdBalance > 0 ? (
        <>
          {Array.from({ length: numChainsWithMusdBalance }, (_, index) => (
            <TokenRowSkeleton key={`token-row-${index}`} />
          ))}
        </>
      ) : (
        <EmptyStateRowSkeleton />
      )}
      {isMoneyHubEnabled && (
        <>
          <BonusSectionSkeleton />
          <ConvertSectionSkeleton tokenCount={conversionTokenCount} />
        </>
      )}
    </ScrollView>
  );
};

CashTokensFullViewSkeleton.displayName = 'CashTokensFullViewSkeleton';

export default CashTokensFullViewSkeleton;
