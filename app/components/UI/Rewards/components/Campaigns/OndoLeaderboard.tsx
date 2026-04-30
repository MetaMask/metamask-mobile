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
import CrownIcon from '../../../../../images/rewards/crown.svg';
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
}

/**
 * LeaderboardEntryRow displays a single leaderboard entry
 */
const LeaderboardEntryRow: React.FC<{
  entry: CampaignLeaderboardEntry;
  isCurrentUser?: boolean;
  showCrown?: boolean;
  isCampaignComplete?: boolean;
}> = ({
  entry,
  isCurrentUser = false,
  showCrown = false,
  isCampaignComplete = false,
}) => {
  const isPositiveReturn = entry.rateOfReturn >= 0;
  const textColor = isCurrentUser
    ? isPositiveReturn
      ? TextColor.SuccessDefault
      : TextColor.ErrorDefault
    : TextColor.TextDefault;
  const isPending = !entry.qualified;
  const rowBg = isCurrentUser
    ? isPending
      ? 'bg-muted'
      : isPositiveReturn
        ? 'bg-success-muted'
        : 'bg-error-muted'
    : '';

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName={`py-2 px-4 ${rowBg}`}
      testID={`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-${entry.rank}`}
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
        {isCurrentUser && isPending && !isCampaignComplete && (
          <PendingTag testID={CAMPAIGN_LEADERBOARD_TEST_IDS.PENDING_TAG} />
        )}
      </Box>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={textColor}
      >
        {formatRateOfReturn(entry.rateOfReturn)}
      </Text>
    </Box>
  );
};

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
  isCampaignComplete = false,
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
      {/* Participants + tier subtitle */}
      {(totalParticipants > 0 || Boolean(selectedTierLabel)) && (
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
            {selectedTierLabel ? (
              <>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {selectedTierLabel}
                </Text>
                {tierNames.length > 1 && (
                  <Icon
                    name={IconName.ArrowDown}
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                  />
                )}
              </>
            ) : null}
          </Box>
        </Pressable>
      )}

      {/* Leaderboard list */}
      {visibleEntries.length > 0 ? (
        <Box testID={CAMPAIGN_LEADERBOARD_TEST_IDS.LIST}>
          {visibleEntries.map((entry) => (
            <LeaderboardEntryRow
              key={`${entry.rank}-${entry.referralCode}`}
              entry={entry}
              isCurrentUser={isCurrentUser(entry)}
              showCrown={!isPreview}
              isCampaignComplete={isCampaignComplete}
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
                  isCampaignComplete={isCampaignComplete}
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
