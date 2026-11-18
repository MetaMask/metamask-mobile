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
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import {
  RankMedal,
  isTopRank,
} from '../../../../Views/Homepage/Sections/TopTraders/topRank';

/** Matches the Social leaderboard row height so skeletons hold the same space. */
export const CAMPAIGN_LEADERBOARD_ROW_HEIGHT = 56;

/** Shared testIDs for leaderboard rows, pending tag, separator, and skeleton (Ondo + Perps). */
export const CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS = {
  ENTRY_ROW: 'campaign-leaderboard-entry-row',
  CURRENT_USER_BAR: 'campaign-leaderboard-current-user-bar',
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
  const showPendingTag =
    isCurrentUser && !entry.qualified && !isCampaignComplete;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={3}
      twClassName={isCurrentUser ? 'px-4 bg-muted' : 'px-4'}
      style={{ height: CAMPAIGN_LEADERBOARD_ROW_HEIGHT }}
      testID={`${CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.ENTRY_ROW}-${entry.rank}`}
    >
      {isCurrentUser && (
        <Box
          twClassName="absolute bottom-0 left-0 top-0 w-0.5 bg-success-default"
          testID={CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.CURRENT_USER_BAR}
        />
      )}
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="min-w-8"
      >
        {isTopRank(entry.rank) ? (
          <RankMedal rank={entry.rank} />
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={
              isCurrentUser ? TextColor.TextAlternative : TextColor.TextMuted
            }
            numberOfLines={1}
          >
            {entry.rank}
          </Text>
        )}
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
        twClassName="flex-1 min-w-0"
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={1}
          twClassName="shrink"
        >
          {entry.referralCode}
        </Text>
        {showCrown && <CrownIcon name="crown" width={14} height={14} />}
        {showPendingTag && (
          <PendingTag
            testID={CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.PENDING_TAG}
          />
        )}
      </Box>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={isPositive ? TextColor.SuccessDefault : TextColor.ErrorDefault}
        numberOfLines={1}
        twClassName="shrink-0"
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
              twClassName="px-4"
              style={{ height: CAMPAIGN_LEADERBOARD_ROW_HEIGHT }}
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
