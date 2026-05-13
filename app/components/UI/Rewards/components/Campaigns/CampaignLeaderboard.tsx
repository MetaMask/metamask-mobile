import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import CrownIcon from '../../../../../images/rewards/crown.svg';
import { PendingTag } from './OndoCampaignStatsSummary';

/** Shared testIDs for leaderboard rows, pending tag, separator, and skeleton (Ondo + Perps). */
export const CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS = {
  ENTRY_ROW: 'campaign-leaderboard-entry-row',
  PENDING_TAG: 'campaign-leaderboard-pending-tag',
  NEIGHBOR_SEPARATOR: 'campaign-leaderboard-neighbor-separator',
  LOADING: 'campaign-leaderboard-loading',
} as const;

/** Fields required to render a campaign leaderboard row (Ondo, Perps, etc.). */
export interface CampaignLeaderboardRowEntry {
  rank: number;
  referralCode: string;
  qualified: boolean;
}

export interface CampaignLeaderboardEntryRowProps<
  T extends CampaignLeaderboardRowEntry,
> {
  entry: T;
  isCurrentUser?: boolean;
  showCrown?: boolean;
  /** When true, hides the pending tag for the current user’s row (campaign ended). */
  isCampaignComplete?: boolean;
  formatPrimaryMetric: (entry: T) => string;
  isPositivePrimaryMetric: (entry: T) => boolean;
}

export function CampaignLeaderboardEntryRow<
  T extends CampaignLeaderboardRowEntry,
>({
  entry,
  isCurrentUser = false,
  showCrown = false,
  isCampaignComplete = false,
  formatPrimaryMetric,
  isPositivePrimaryMetric,
}: CampaignLeaderboardEntryRowProps<T>) {
  const isPositive = isPositivePrimaryMetric(entry);
  const textColor = isCurrentUser
    ? isPositive
      ? TextColor.SuccessDefault
      : TextColor.ErrorDefault
    : TextColor.TextDefault;
  const isPending = !entry.qualified;
  const rowBg = isCurrentUser
    ? isPending
      ? 'bg-muted'
      : isPositive
        ? 'bg-success-muted'
        : 'bg-error-muted'
    : '';

  const showPendingTag = isCurrentUser && isPending && !isCampaignComplete;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName={`py-2 px-4 ${rowBg}`}
      testID={`${CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.ENTRY_ROW}-${entry.rank}`}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-3"
      >
        <Text variant={TextVariant.BodyMd} color={textColor} twClassName="w-8">
          {String(entry.rank).padStart(2, '0')}
        </Text>
        <Box twClassName="flex-row items-center gap-1">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={textColor}
          >
            {entry.referralCode}
          </Text>
          {showCrown && entry.rank <= 5 && (
            <CrownIcon name="crown" width={14} height={14} />
          )}
        </Box>
        {showPendingTag && (
          <PendingTag
            testID={CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.PENDING_TAG}
          />
        )}
      </Box>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={textColor}
      >
        {formatPrimaryMetric(entry)}
      </Text>
    </Box>
  );
}

export interface CampaignLeaderboardSkeletonProps {
  /** Number of placeholder rows (default 10; Perps uses 5). */
  skeletonRowCount?: number;
}

const DEFAULT_SKELETON_ROW_COUNT = 10;

export const CampaignLeaderboardSkeleton: React.FC<
  CampaignLeaderboardSkeletonProps
> = ({ skeletonRowCount = DEFAULT_SKELETON_ROW_COUNT }) => {
  const tw = useTailwind();
  const rows = Array.from(
    { length: skeletonRowCount },
    (_, index) => index + 1,
  );

  return (
    <Box testID={CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.LOADING}>
      <Box twClassName="rounded-xl overflow-hidden">
        {rows.map((i) => (
          <Box key={i}>
            <Box
              flexDirection={BoxFlexDirection.Row}
              justifyContent={BoxJustifyContent.Between}
              alignItems={BoxAlignItems.Center}
              twClassName="py-1 px-4"
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-3"
              >
                <Skeleton style={tw.style('h-5 w-8 rounded')} />
                <Skeleton style={tw.style('h-5 w-20 rounded')} />
              </Box>
              <Skeleton style={tw.style('h-5 w-16 rounded')} />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export const CampaignLeaderboardNeighborSeparator: React.FC = () => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="py-1"
    testID={CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.NEIGHBOR_SEPARATOR}
  >
    <Box twClassName="flex-1 border-b border-border-muted" />
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      twClassName="px-3"
    >
      •••
    </Text>
    <Box twClassName="flex-1 border-b border-border-muted" />
  </Box>
);
