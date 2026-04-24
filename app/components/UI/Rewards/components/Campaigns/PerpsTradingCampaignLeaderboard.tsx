import React, { useCallback, useMemo } from 'react';
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
import type { PerpsTradingCampaignLeaderboardEntry } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import RewardsErrorBanner from '../RewardsErrorBanner';
import CrownIcon from '../../../../../images/rewards/crown.svg';
import { PendingTag } from './OndoCampaignStatsSummary';
import { formatComputedAt, formatSignedUsd } from '../../utils/formatUtils';

export const PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS = {
  CONTAINER: 'perps-campaign-leaderboard-container',
  LIST: 'perps-campaign-leaderboard-list',
  ENTRY_ROW: 'perps-campaign-leaderboard-entry-row',
  PENDING_TAG: 'perps-campaign-leaderboard-pending-tag',
  NEIGHBOR_SEPARATOR: 'perps-campaign-leaderboard-neighbor-separator',
  LOADING: 'perps-campaign-leaderboard-loading',
  ERROR: 'perps-campaign-leaderboard-error',
  EMPTY: 'perps-campaign-leaderboard-empty',
  NOT_YET_COMPUTED: 'perps-campaign-leaderboard-not-yet-computed',
  TOTAL_PARTICIPANTS: 'perps-campaign-leaderboard-total-participants',
} as const;

const MAX_ENTRIES_LIMIT = 20;
const SPLIT_VIEW_TOP_COUNT_PREVIEW = 3;
/** Ranks just below the first page: show one fewer top rows to keep split view from crowding the neighbor block. */
const FULL_SPLIT_TOP_REDUCED_AT_RANKS: readonly number[] = [21, 22];

interface UserPosition {
  rank: number;
  neighbors: PerpsTradingCampaignLeaderboardEntry[];
}

export interface PerpsTradingCampaignLeaderboardProps {
  entries: PerpsTradingCampaignLeaderboardEntry[];
  totalParticipants: number;
  computedAt: string | null;
  isLoading: boolean;
  hasError: boolean;
  isLeaderboardNotYetComputed?: boolean;
  onRetry?: () => void;
  currentUserReferralCode?: string | null;
  maxEntries?: number;
  userPosition?: UserPosition | null;
  campaignId?: string;
}

const LeaderboardEntryRow: React.FC<{
  entry: PerpsTradingCampaignLeaderboardEntry;
  isCurrentUser?: boolean;
  showCrown?: boolean;
}> = ({ entry, isCurrentUser = false, showCrown = false }) => {
  const isPositivePnl = entry.pnl >= 0;
  const textColor = isCurrentUser
    ? isPositivePnl
      ? TextColor.SuccessDefault
      : TextColor.ErrorDefault
    : TextColor.TextDefault;
  const isPending = !entry.qualified;
  const rowBg = isCurrentUser
    ? isPending
      ? 'bg-muted'
      : isPositivePnl
        ? 'bg-success-muted'
        : 'bg-error-muted'
    : '';

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName={`py-2 px-4 ${rowBg}`}
      testID={`${PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-${entry.rank}`}
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
        {isCurrentUser && isPending && (
          <PendingTag
            testID={PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS.PENDING_TAG}
          />
        )}
      </Box>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={textColor}
      >
        {formatSignedUsd(entry.pnl)}
      </Text>
    </Box>
  );
};

const LeaderboardSkeleton: React.FC = () => {
  const tw = useTailwind();
  return (
    <Box testID={PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS.LOADING}>
      <Box twClassName="rounded-xl overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
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

const NeighborSeparator: React.FC = () => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="py-1"
    testID={PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS.NEIGHBOR_SEPARATOR}
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

const PerpsTradingCampaignLeaderboard: React.FC<
  PerpsTradingCampaignLeaderboardProps
> = ({
  entries,
  totalParticipants,
  computedAt,
  isLoading,
  hasError,
  isLeaderboardNotYetComputed = false,
  onRetry,
  currentUserReferralCode,
  maxEntries,
  userPosition,
}) => {
  const isPreview = maxEntries != null;

  const effectiveMaxEntries =
    maxEntries != null && maxEntries <= MAX_ENTRIES_LIMIT
      ? maxEntries
      : MAX_ENTRIES_LIMIT;

  /** Top rows above the neighbor separator in split view (preview: 3; full: 18 for rank 21–22, else 20). */
  const splitViewTopCount = useMemo(() => {
    if (isPreview) {
      return SPLIT_VIEW_TOP_COUNT_PREVIEW;
    }
    const rank = userPosition?.rank;
    if (rank == null) {
      return MAX_ENTRIES_LIMIT;
    }
    return FULL_SPLIT_TOP_REDUCED_AT_RANKS.includes(rank)
      ? MAX_ENTRIES_LIMIT - 2
      : MAX_ENTRIES_LIMIT;
  }, [isPreview, userPosition?.rank]);

  const showSplitView = useMemo(() => {
    if (!userPosition) return false;
    return (
      userPosition.rank > effectiveMaxEntries &&
      userPosition.neighbors.length > 0
    );
  }, [userPosition, effectiveMaxEntries]);

  const visibleEntries = useMemo(() => {
    if (showSplitView) {
      return entries.slice(0, splitViewTopCount);
    }
    return entries.slice(0, effectiveMaxEntries);
  }, [entries, effectiveMaxEntries, showSplitView, splitViewTopCount]);

  const isCurrentUser = useCallback(
    (entry: PerpsTradingCampaignLeaderboardEntry) =>
      !!currentUserReferralCode &&
      entry.referralCode === currentUserReferralCode,
    [currentUserReferralCode],
  );

  if (isLoading && entries.length === 0) {
    return <LeaderboardSkeleton />;
  }

  if (hasError && entries.length === 0) {
    return (
      <Box twClassName="px-4">
        <RewardsErrorBanner
          title={strings(
            'rewards.perps_trading_campaign.leaderboard_error_loading',
          )}
          description={strings(
            'rewards.perps_trading_campaign.leaderboard_error_loading_description',
          )}
          onConfirm={onRetry}
          confirmButtonLabel={strings(
            'rewards.perps_trading_campaign.prize_pool_retry_button',
          )}
          testID={PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS.ERROR}
        />
      </Box>
    );
  }

  if (isLeaderboardNotYetComputed && !isLoading && entries.length === 0) {
    return (
      <Box twClassName="p-4 items-center">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS.NOT_YET_COMPUTED}
        >
          {strings(
            'rewards.perps_trading_campaign.leaderboard_not_yet_computed',
          )}
        </Text>
      </Box>
    );
  }

  if (entries.length === 0) {
    return (
      <Box twClassName="p-4 items-center">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS.EMPTY}
        >
          {strings(
            'rewards.perps_trading_campaign.leaderboard_not_yet_computed',
          )}
        </Text>
      </Box>
    );
  }

  return (
    <Box testID={PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS.CONTAINER}>
      {/* Leaderboard list */}
      <Box testID={PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS.LIST}>
        {visibleEntries.map((entry) => (
          <LeaderboardEntryRow
            key={`${entry.rank}-${entry.referralCode}`}
            entry={entry}
            isCurrentUser={isCurrentUser(entry)}
            showCrown={!isPreview}
          />
        ))}
        {showSplitView && userPosition && (
          <>
            <NeighborSeparator />
            {userPosition.neighbors.map((entry) => (
              <LeaderboardEntryRow
                key={`neighbor-${entry.rank}-${entry.referralCode}`}
                entry={entry}
                isCurrentUser={isCurrentUser(entry)}
                showCrown={!isPreview}
              />
            ))}
          </>
        )}
      </Box>
    </Box>
  );
};

export default PerpsTradingCampaignLeaderboard;
