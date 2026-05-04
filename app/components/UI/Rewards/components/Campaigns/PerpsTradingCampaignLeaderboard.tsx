import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { PerpsTradingCampaignLeaderboardEntry } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { formatSignedUsd } from '../../utils/formatUtils';
import {
  CampaignLeaderboardEntryRow,
  CampaignLeaderboardNeighborSeparator,
  CampaignLeaderboardSkeleton,
  CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS,
} from './CampaignLeaderboard';
import Routes from '../../../../../constants/navigation/Routes';
import { HYPERTRACKER_ATTRIBUTION_URL } from '../../utils/perpsCampaignConstants';

export const PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS = {
  CONTAINER: 'perps-campaign-leaderboard-container',
  LIST: 'perps-campaign-leaderboard-list',
  ENTRY_ROW: CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.ENTRY_ROW,
  PENDING_TAG: CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.PENDING_TAG,
  NEIGHBOR_SEPARATOR: CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.NEIGHBOR_SEPARATOR,
  LOADING: CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.LOADING,
  ERROR: 'perps-campaign-leaderboard-error',
  EMPTY: 'perps-campaign-leaderboard-empty',
  NOT_YET_COMPUTED: 'perps-campaign-leaderboard-not-yet-computed',
  TOTAL_PARTICIPANTS: 'perps-campaign-leaderboard-total-participants',
  POWERED_BY: 'perps-campaign-leaderboard-powered-by',
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
  isLoading: boolean;
  hasError: boolean;
  isLeaderboardNotYetComputed?: boolean;
  onRetry?: () => void;
  currentUserReferralCode?: string | null;
  maxEntries?: number;
  userPosition?: UserPosition | null;
  campaignId?: string;
  isCampaignComplete?: boolean;
}

const PerpsTradingCampaignLeaderboard: React.FC<
  PerpsTradingCampaignLeaderboardProps
> = ({
  entries,
  isLoading,
  hasError,
  isLeaderboardNotYetComputed = false,
  onRetry,
  currentUserReferralCode,
  maxEntries,
  userPosition,
  isCampaignComplete = false,
}) => {
  const navigation = useNavigation();

  const handleHyperTrackerPress = useCallback(() => {
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: HYPERTRACKER_ATTRIBUTION_URL,
        timestamp: Date.now(),
      },
    });
  }, [navigation]);

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
    return <CampaignLeaderboardSkeleton skeletonRowCount={5} />;
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
          <CampaignLeaderboardEntryRow
            key={`${entry.rank}-${entry.referralCode}`}
            entry={entry}
            isCurrentUser={isCurrentUser(entry)}
            showCrown={!isPreview}
            isCampaignComplete={isCampaignComplete}
            formatPrimaryMetric={(e) => formatSignedUsd(e.pnl)}
            isPositivePrimaryMetric={(e) => e.pnl >= 0}
          />
        ))}
        {showSplitView && userPosition && (
          <>
            <CampaignLeaderboardNeighborSeparator />
            {userPosition.neighbors.map((entry) => (
              <CampaignLeaderboardEntryRow
                key={`neighbor-${entry.rank}-${entry.referralCode}`}
                entry={entry}
                isCurrentUser={isCurrentUser(entry)}
                showCrown={!isPreview}
                isCampaignComplete={isCampaignComplete}
                formatPrimaryMetric={(e) => formatSignedUsd(e.pnl)}
                isPositivePrimaryMetric={(e) => e.pnl >= 0}
              />
            ))}
          </>
        )}
      </Box>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextDefault}
        twClassName="mt-4 px-4 w-full"
        testID={PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS.POWERED_BY}
      >
        {strings(
          'rewards.perps_trading_campaign.leaderboard_powered_by_prefix',
        )}
        <Text
          variant={TextVariant.BodySm}
          twClassName="text-primary-default"
          onPress={handleHyperTrackerPress}
        >
          {strings(
            'rewards.perps_trading_campaign.leaderboard_hypertracker_brand',
          )}
        </Text>
      </Text>
    </Box>
  );
};

export default PerpsTradingCampaignLeaderboard;
