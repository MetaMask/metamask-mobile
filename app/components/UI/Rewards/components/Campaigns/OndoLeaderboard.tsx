import React, { useCallback, useMemo } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import type { CampaignLeaderboardEntry } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import RewardsErrorBanner from '../RewardsErrorBanner';
import {
  CampaignLeaderboardEntryRow,
  CampaignLeaderboardNeighborSeparator,
  CampaignLeaderboardSkeleton,
  CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS,
} from './CampaignLeaderboard';
import {
  formatRateOfReturn,
  formatTierDisplayName,
} from './OndoLeaderboard.utils';

export const CAMPAIGN_LEADERBOARD_TEST_IDS = {
  CONTAINER: 'campaign-leaderboard-container',
  TIER_TOGGLE: 'campaign-leaderboard-tier-toggle',
  LIST: 'campaign-leaderboard-list',
  ENTRY_ROW: CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.ENTRY_ROW,
  PENDING_TAG: CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.PENDING_TAG,
  NEIGHBOR_SEPARATOR: CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.NEIGHBOR_SEPARATOR,
  LOADING: CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.LOADING,
  ERROR: 'campaign-leaderboard-error',
  EMPTY: 'campaign-leaderboard-empty',
  NOT_YET_COMPUTED: 'campaign-leaderboard-not-yet-computed',
  LAST_COMPUTED: 'campaign-leaderboard-last-computed',
} as const;

const MAX_ENTRIES_LIMIT = 20;
const SPLIT_VIEW_TOP_COUNT_PREVIEW = 3;
/** Ranks just below the first page: show one fewer top rows to keep split view from crowding the neighbor block. */
const FULL_SPLIT_TOP_REDUCED_AT_RANKS: readonly number[] = [21, 22];

interface UserPosition {
  projectedTier: string;
  rank: number;
  neighbors: CampaignLeaderboardEntry[];
}

interface CampaignLeaderboardProps {
  tierNames: string[];
  selectedTier: string | null;
  onTierChange: (tier: string) => void;
  entries: CampaignLeaderboardEntry[];
  totalParticipants: number;
  isLoading: boolean;
  hasError: boolean;
  isLeaderboardNotYetComputed?: boolean;
  onRetry?: () => void;
  currentUserReferralCode?: string | null;
  /** Limit entries shown. Values above 20 are ignored (all entries shown). */
  maxEntries?: number;
  /** User's leaderboard position; enables neighbor display in preview mode. */
  userPosition?: UserPosition | null;
  /** Campaign ID used for analytics tracking. */
  campaignId?: string;
  isCampaignComplete?: boolean;
  /** When true, hides the participants + tier toggle header row (used when the view renders its own tier selector). */
  hideTierHeader?: boolean;
}

const OndoLeaderboard: React.FC<CampaignLeaderboardProps> = ({
  tierNames,
  selectedTier,
  onTierChange,
  entries,
  totalParticipants,
  isLoading,
  hasError,
  isLeaderboardNotYetComputed = false,
  onRetry,
  currentUserReferralCode,
  maxEntries,
  userPosition,
  campaignId,
  isCampaignComplete = false,
  hideTierHeader = false,
}) => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();

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
      userPosition.projectedTier === selectedTier &&
      userPosition.rank > effectiveMaxEntries &&
      userPosition.neighbors.length > 0
    );
  }, [userPosition, effectiveMaxEntries, selectedTier]);

  const visibleEntries = useMemo(() => {
    if (showSplitView) {
      return entries.slice(0, splitViewTopCount);
    }
    return entries.slice(0, effectiveMaxEntries);
  }, [showSplitView, entries, effectiveMaxEntries, splitViewTopCount]);

  const selectedTierLabel = selectedTier
    ? formatTierDisplayName(selectedTier)
    : '';

  const tierOptions = useMemo(
    () =>
      tierNames.map((name) => ({
        key: name,
        value: name,
        label: formatTierDisplayName(name),
      })),
    [tierNames],
  );

  const openTierSelector = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
        .addProperties({
          button_type: 'ondo_campaign_leaderboard_tier_select',
        })
        .build(),
    );
    navigation.navigate(Routes.MODAL.REWARDS_SELECT_SHEET, {
      title: strings('rewards.ondo_campaign_leaderboard.select_tier'),
      options: tierOptions,
      selectedValue: selectedTier,
      onSelect: onTierChange,
    });
  }, [
    navigation,
    tierOptions,
    selectedTier,
    onTierChange,
    trackEvent,
    createEventBuilder,
  ]);

  const isCurrentUser = useCallback(
    (entry: CampaignLeaderboardEntry) =>
      !!currentUserReferralCode &&
      entry.referralCode === currentUserReferralCode,
    [currentUserReferralCode],
  );

  if (isLoading && entries.length === 0) {
    return <CampaignLeaderboardSkeleton />;
  }

  if (hasError && entries.length === 0) {
    return (
      <Box twClassName="px-4">
        <RewardsErrorBanner
          title={strings('rewards.ondo_campaign_leaderboard.error_loading')}
          description={strings(
            'rewards.ondo_campaign_leaderboard.error_loading_description',
          )}
          onConfirm={onRetry}
          confirmButtonLabel={strings(
            'rewards.ondo_campaign_leaderboard.retry',
          )}
          testID={CAMPAIGN_LEADERBOARD_TEST_IDS.ERROR}
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
          testID={CAMPAIGN_LEADERBOARD_TEST_IDS.NOT_YET_COMPUTED}
        >
          {strings('rewards.ondo_campaign_leaderboard.not_yet_computed')}
        </Text>
      </Box>
    );
  }

  if (tierNames.length === 0) {
    return (
      <Box twClassName="p-4 items-center">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={CAMPAIGN_LEADERBOARD_TEST_IDS.EMPTY}
        >
          {strings('rewards.ondo_campaign_leaderboard.no_data')}
        </Text>
      </Box>
    );
  }

  return (
    <Box testID={CAMPAIGN_LEADERBOARD_TEST_IDS.CONTAINER}>
      {/* Participants + tier subtitle */}
      {!hideTierHeader &&
        (totalParticipants > 0 || Boolean(selectedTierLabel)) && (
          <Pressable
            onPress={tierNames.length > 1 ? openTierSelector : undefined}
            testID={CAMPAIGN_LEADERBOARD_TEST_IDS.TIER_TOGGLE}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-2 mb-2 px-4"
            >
              {totalParticipants > 0 && (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.SuccessDefault}
                >
                  {strings(
                    'rewards.ondo_campaign_leaderboard.total_participants',
                    {
                      count: totalParticipants.toLocaleString(),
                    },
                  )}
                </Text>
              )}
              {Boolean(selectedTierLabel) && (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {selectedTierLabel}
                </Text>
              )}
            </Box>
          </Pressable>
        )}

      {/* Leaderboard list */}
      {visibleEntries.length > 0 ? (
        <Box testID={CAMPAIGN_LEADERBOARD_TEST_IDS.LIST}>
          {visibleEntries.map((entry) => (
            <CampaignLeaderboardEntryRow
              key={`${entry.rank}-${entry.referralCode}`}
              entry={entry}
              isCurrentUser={isCurrentUser(entry)}
              showCrown={!isPreview}
              isCampaignComplete={isCampaignComplete}
              formatPrimaryMetric={(e) => formatRateOfReturn(e.rateOfReturn)}
              isPositivePrimaryMetric={(e) => e.rateOfReturn >= 0}
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
                  formatPrimaryMetric={(e) =>
                    formatRateOfReturn(e.rateOfReturn)
                  }
                  isPositivePrimaryMetric={(e) => e.rateOfReturn >= 0}
                />
              ))}
            </>
          )}
        </Box>
      ) : (
        <Box twClassName="p-4 items-center">
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('rewards.ondo_campaign_leaderboard.no_entries_in_tier')}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default OndoLeaderboard;
