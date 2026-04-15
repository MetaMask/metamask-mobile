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
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { CampaignLeaderboardEntry } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { PendingTag } from './CampaignStatsSummary';
import {
  formatRateOfReturn,
  formatTierDisplayName,
} from './OndoLeaderboard.utils';

export const CAMPAIGN_LEADERBOARD_TEST_IDS = {
  CONTAINER: 'campaign-leaderboard-container',
  TIER_TOGGLE: 'campaign-leaderboard-tier-toggle',
  LIST: 'campaign-leaderboard-list',
  ENTRY_ROW: 'campaign-leaderboard-entry-row',
  PENDING_TAG: 'campaign-leaderboard-pending-tag',
  NEIGHBOR_SEPARATOR: 'campaign-leaderboard-neighbor-separator',
  LOADING: 'campaign-leaderboard-loading',
  ERROR: 'campaign-leaderboard-error',
  EMPTY: 'campaign-leaderboard-empty',
  NOT_YET_COMPUTED: 'campaign-leaderboard-not-yet-computed',
} as const;

const MAX_ENTRIES_LIMIT = 20;
const SPLIT_VIEW_TOP_COUNT = 3;

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
}

/**
 * LeaderboardEntryRow displays a single leaderboard entry
 */
const LeaderboardEntryRow: React.FC<{
  entry: CampaignLeaderboardEntry;
  isCurrentUser?: boolean;
}> = ({ entry, isCurrentUser = false }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName={`py-2 px-4 ${isCurrentUser ? 'bg-background-muted' : ''}`}
    testID={`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-${entry.rank}`}
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-3"
    >
      <Text variant={TextVariant.BodyMd} twClassName="w-8">
        {String(entry.rank).padStart(2, '0')}.
      </Text>
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {entry.referralCode}
      </Text>
      {isCurrentUser && !entry.qualified && (
        <PendingTag testID={CAMPAIGN_LEADERBOARD_TEST_IDS.PENDING_TAG} />
      )}
    </Box>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={
        isCurrentUser
          ? entry.rateOfReturn >= 0
            ? TextColor.SuccessDefault
            : TextColor.ErrorDefault
          : TextColor.TextDefault
      }
    >
      {formatRateOfReturn(entry.rateOfReturn)}
    </Text>
  </Box>
);

/**
 * LeaderboardSkeleton displays loading skeleton for the leaderboard section
 */
const LeaderboardSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box testID={CAMPAIGN_LEADERBOARD_TEST_IDS.LOADING}>
      {/* Leaderboard rows skeleton */}
      <Box twClassName="rounded-xl overflow-hidden">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
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

/**
 * OndoLeaderboard displays the leaderboard tiers and entries for a campaign.
 * Position-specific data (user rank, tier, deposited value) is handled separately
 * by the OndoLeaderboardPosition component.
 */
const NeighborSeparator: React.FC = () => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="py-1"
    testID={CAMPAIGN_LEADERBOARD_TEST_IDS.NEIGHBOR_SEPARATOR}
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
}) => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const showSplitView = useMemo(() => {
    if (!userPosition || maxEntries == null || maxEntries > MAX_ENTRIES_LIMIT) {
      return false;
    }
    return (
      userPosition.projectedTier === selectedTier &&
      userPosition.rank > maxEntries &&
      userPosition.neighbors.length > 0
    );
  }, [userPosition, maxEntries, selectedTier]);

  const visibleEntries = useMemo(() => {
    if (showSplitView) {
      return entries.slice(0, SPLIT_VIEW_TOP_COUNT);
    }
    if (maxEntries != null && maxEntries <= MAX_ENTRIES_LIMIT) {
      return entries.slice(0, maxEntries);
    }
    return entries;
  }, [entries, maxEntries, showSplitView]);

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
    return <LeaderboardSkeleton />;
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
      {/* Tier selector */}
      {tierNames.length > 1 ? (
        <Pressable
          onPress={openTierSelector}
          testID={CAMPAIGN_LEADERBOARD_TEST_IDS.TIER_TOGGLE}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1 mb-2 self-start px-4"
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {selectedTierLabel}
            </Text>
            <Icon
              name={IconName.SwapVertical}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          </Box>
        </Pressable>
      ) : null}

      {/* Error banner when has error but no data to display */}
      {hasError && !isLoading && entries.length === 0 && (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          testID={CAMPAIGN_LEADERBOARD_TEST_IDS.ERROR}
        >
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            twClassName="flex-1"
          >
            {strings('rewards.ondo_campaign_leaderboard.error_loading')}
          </Text>
          {onRetry && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.ErrorDefault}
              fontWeight={FontWeight.Medium}
              onPress={onRetry}
              twClassName="ml-2"
            >
              {strings('rewards.ondo_campaign_leaderboard.retry')}
            </Text>
          )}
        </Box>
      )}

      {/* Leaderboard list */}
      {visibleEntries.length > 0 ? (
        <Box testID={CAMPAIGN_LEADERBOARD_TEST_IDS.LIST}>
          {visibleEntries.map((entry) => (
            <LeaderboardEntryRow
              key={`${entry.rank}-${entry.referralCode}`}
              entry={entry}
              isCurrentUser={isCurrentUser(entry)}
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

      {/* Total participants */}
      {totalParticipants > 0 && (
        <Box twClassName="mt-2 px-4">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('rewards.ondo_campaign_leaderboard.total_participants', {
              count: totalParticipants.toLocaleString(),
            })}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default OndoLeaderboard;
