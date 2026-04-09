import React, { useCallback, useMemo } from 'react';
import { FlatList, ListRenderItemInfo, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import RewardsInfoBanner from '../RewardsInfoBanner';
import {
  formatRateOfReturn,
  formatTierDisplayName,
} from './OndoLeaderboard.utils';

export const CAMPAIGN_LEADERBOARD_TEST_IDS = {
  CONTAINER: 'campaign-leaderboard-container',
  TIER_TOGGLE: 'campaign-leaderboard-tier-toggle',
  LIST: 'campaign-leaderboard-list',
  ENTRY_ROW: 'campaign-leaderboard-entry-row',
  LOADING: 'campaign-leaderboard-loading',
  ERROR: 'campaign-leaderboard-error',
  EMPTY: 'campaign-leaderboard-empty',
  NOT_YET_COMPUTED: 'campaign-leaderboard-not-yet-computed',
} as const;

const MAX_ENTRIES_LIMIT = 20;

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
  showTitle?: boolean;
  /** Limit entries shown. Values above 20 are ignored (all entries shown). */
  maxEntries?: number;
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
    twClassName={`py-1 ${isCurrentUser ? 'bg-background-muted' : ''}`}
    testID={`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-${entry.rank}`}
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-3"
    >
      <Text
        variant={TextVariant.BodyMd}
        twClassName="w-8 text-text-alternative"
      >
        #{String(entry.rank).padStart(2, '0')}
      </Text>
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {entry.referralCode}
      </Text>
    </Box>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={
        entry.rateOfReturn >= 0
          ? TextColor.SuccessDefault
          : TextColor.ErrorDefault
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
    <Box twClassName="py-4" testID={CAMPAIGN_LEADERBOARD_TEST_IDS.LOADING}>
      {/* Header skeleton */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Center}
        twClassName="mb-4"
      >
        <Skeleton style={tw.style('h-6 w-32 rounded-lg')} />
        <Skeleton style={tw.style('h-4 w-24 rounded-lg')} />
      </Box>
      {/* Tier tabs skeleton */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="gap-2 mb-4"
        justifyContent={BoxJustifyContent.Center}
      >
        <Skeleton style={tw.style('h-10 w-24 rounded-full')} />
        <Skeleton style={tw.style('h-10 w-24 rounded-full')} />
        <Skeleton style={tw.style('h-10 w-24 rounded-full')} />
      </Box>
      {/* Participants count skeleton */}
      <Skeleton style={tw.style('h-4 w-28 rounded-lg mb-2')} />
      {/* Leaderboard rows skeleton */}
      <Box twClassName="bg-muted rounded-xl overflow-hidden">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <Box key={i}>
            <Box
              flexDirection={BoxFlexDirection.Row}
              justifyContent={BoxJustifyContent.Between}
              alignItems={BoxAlignItems.Center}
              twClassName="py-3 px-4"
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
  showTitle = true,
  maxEntries,
}) => {
  const navigation = useNavigation();

  const visibleEntries = useMemo(() => {
    if (maxEntries != null && maxEntries <= MAX_ENTRIES_LIMIT) {
      return entries.slice(0, maxEntries);
    }
    return entries;
  }, [entries, maxEntries]);

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
    navigation.navigate(Routes.MODAL.REWARDS_SELECT_SHEET, {
      title: strings('rewards.ondo_campaign_leaderboard.select_tier'),
      options: tierOptions,
      selectedValue: selectedTier,
      onSelect: onTierChange,
    });
  }, [navigation, tierOptions, selectedTier, onTierChange]);

  const renderEntry = ({
    item,
  }: ListRenderItemInfo<CampaignLeaderboardEntry>) => (
    <LeaderboardEntryRow
      entry={item}
      isCurrentUser={
        !!currentUserReferralCode &&
        item.referralCode === currentUserReferralCode
      }
    />
  );

  const keyExtractor = (item: CampaignLeaderboardEntry) =>
    `${item.rank}-${item.referralCode}`;

  if (isLoading && entries.length === 0) {
    return <LeaderboardSkeleton />;
  }

  if (hasError && entries.length === 0) {
    return (
      <RewardsErrorBanner
        title={strings('rewards.ondo_campaign_leaderboard.error_loading')}
        description={strings(
          'rewards.ondo_campaign_leaderboard.error_loading_description',
        )}
        onConfirm={onRetry}
        confirmButtonLabel={strings('rewards.ondo_campaign_leaderboard.retry')}
        testID={CAMPAIGN_LEADERBOARD_TEST_IDS.ERROR}
      />
    );
  }

  if (isLeaderboardNotYetComputed && !isLoading && entries.length === 0) {
    return (
      <RewardsInfoBanner
        title={<></>}
        description={strings(
          'rewards.ondo_campaign_leaderboard.not_yet_computed',
        )}
        testID={CAMPAIGN_LEADERBOARD_TEST_IDS.NOT_YET_COMPUTED}
      />
    );
  }

  if (tierNames.length === 0) {
    return (
      <RewardsInfoBanner
        title={<></>}
        description={strings('rewards.ondo_campaign_leaderboard.no_data')}
        showInfoIcon
        testID={CAMPAIGN_LEADERBOARD_TEST_IDS.EMPTY}
      />
    );
  }

  return (
    <Box testID={CAMPAIGN_LEADERBOARD_TEST_IDS.CONTAINER}>
      {/* Title */}
      {showTitle && (
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Bold}
          twClassName="mb-4"
        >
          {strings('rewards.ondo_campaign_leaderboard.title')}
        </Text>
      )}

      {/* Tier selector */}
      {tierNames.length > 1 ? (
        <Pressable
          onPress={openTierSelector}
          testID={CAMPAIGN_LEADERBOARD_TEST_IDS.TIER_TOGGLE}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1 mb-4 self-start"
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
          <FlatList
            data={visibleEntries}
            renderItem={renderEntry}
            keyExtractor={keyExtractor}
            scrollEnabled={false}
          />
        </Box>
      ) : (
        <Box twClassName="py-8 items-center">
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
      <Box twClassName="mt-2">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('rewards.ondo_campaign_leaderboard.total_participants', {
            count: totalParticipants.toLocaleString(),
          })}
        </Text>
      </Box>
    </Box>
  );
};

export default OndoLeaderboard;
