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
import { PendingTag } from './CampaignStatsSummary';
import {
  formatPnl,
  formatComputedAt,
} from './PerpsTradingCampaignLeaderboard.utils';

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
} as const;

const MAX_ENTRIES_LIMIT = 20;
const SPLIT_VIEW_TOP_COUNT = 3;

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
        {formatPnl(entry.pnl)}
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

  const showSplitView = useMemo(() => {
    if (!userPosition) return false;
    return (
      userPosition.rank > effectiveMaxEntries &&
      userPosition.neighbors.length > 0
    );
  }, [userPosition, effectiveMaxEntries]);

  const visibleEntries = useMemo(() => {
    if (showSplitView) {
      return entries.slice(0, SPLIT_VIEW_TOP_COUNT);
    }
    return entries.slice(0, effectiveMaxEntries);
  }, [entries, effectiveMaxEntries, showSplitView]);

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

      {/* Footer */}
      <Box twClassName="mt-2 px-4 gap-0.5">
        {totalParticipants > 0 && (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings(
              'rewards.perps_trading_campaign.leaderboard_total_participants',
              { count: totalParticipants.toLocaleString() },
            )}
          </Text>
        )}
        {computedAt && (
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {strings(
              'rewards.perps_trading_campaign.leaderboard_last_updated',
              {
                time: formatComputedAt(computedAt),
              },
            )}
            {' · '}
            {strings('rewards.perps_trading_campaign.leaderboard_updates_info')}
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default PerpsTradingCampaignLeaderboard;
