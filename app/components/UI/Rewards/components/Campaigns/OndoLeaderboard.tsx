import React, { useMemo } from 'react';
import { FlatList, ListRenderItemInfo } from 'react-native';
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
import TabsBar from '../../../../../component-library/components-temp/Tabs/TabsBar';
import type { CampaignLeaderboardEntry } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import RewardsErrorBanner from '../RewardsErrorBanner';
import RewardsInfoBanner from '../RewardsInfoBanner';
import { formatRateOfReturn, formatComputedAt } from './OndoLeaderboard.utils';

const ListSeparator = () => <Box twClassName="border-b border-border-muted" />;

export const CAMPAIGN_LEADERBOARD_TEST_IDS = {
  CONTAINER: 'campaign-leaderboard-container',
  TIER_TOGGLE: 'campaign-leaderboard-tier-toggle',
  LIST: 'campaign-leaderboard-list',
  ENTRY_ROW: 'campaign-leaderboard-entry-row',
  COMPUTED_AT: 'campaign-leaderboard-computed-at',
  LOADING: 'campaign-leaderboard-loading',
  ERROR: 'campaign-leaderboard-error',
  EMPTY: 'campaign-leaderboard-empty',
  NOT_YET_COMPUTED: 'campaign-leaderboard-not-yet-computed',
} as const;

interface CampaignLeaderboardProps {
  tierNames: string[];
  selectedTier: string | null;
  onTierChange: (tier: string) => void;
  entries: CampaignLeaderboardEntry[];
  totalParticipants: number;
  computedAt: string | null;
  isLoading: boolean;
  hasError: boolean;
  isLeaderboardNotYetComputed?: boolean;
  onRetry?: () => void;
  currentUserReferralCode?: string | null;
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
    twClassName="py-3 px-4"
    testID={`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-${entry.rank}`}
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-3"
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={isCurrentUser ? FontWeight.Bold : FontWeight.Medium}
        color={isCurrentUser ? TextColor.SuccessDefault : undefined}
        twClassName="w-8"
      >
        #{entry.rank}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={isCurrentUser ? FontWeight.Bold : undefined}
        color={isCurrentUser ? TextColor.SuccessDefault : undefined}
      >
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
            {i < 10 && <Box twClassName="border-b border-border-muted" />}
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
  computedAt,
  isLoading,
  hasError,
  isLeaderboardNotYetComputed = false,
  onRetry,
  currentUserReferralCode,
}) => {
  const tabs = useMemo(
    () =>
      tierNames.map((name) => ({
        key: name,
        label: name.toUpperCase(),
        content: null,
      })),
    [tierNames],
  );

  const selectedIndex = selectedTier ? tierNames.indexOf(selectedTier) : 0;

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
      {/* Header with title and computed at */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Center}
        twClassName="mb-4"
      >
        <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
          {strings('rewards.ondo_campaign_leaderboard.title')}
        </Text>
        {computedAt ? (
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            testID={CAMPAIGN_LEADERBOARD_TEST_IDS.COMPUTED_AT}
          >
            {strings('rewards.ondo_campaign_leaderboard.updated_at', {
              time: formatComputedAt(computedAt),
            })}
          </Text>
        ) : null}
      </Box>

      {/* Tier selector */}
      {tabs.length > 1 && (
        <Box twClassName="mb-4 -mx-4">
          <TabsBar
            tabs={tabs}
            activeIndex={selectedIndex}
            onTabPress={(index) => onTierChange(tierNames[index])}
            testID={CAMPAIGN_LEADERBOARD_TEST_IDS.TIER_TOGGLE}
          />
        </Box>
      )}

      {/* Error banner when has error but no data to display */}
      {hasError && !isLoading && entries.length === 0 && (
        <Box
          twClassName="bg-error-muted rounded-lg p-3 mb-4"
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

      {/* Total participants */}
      <Box twClassName="mb-2">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('rewards.ondo_campaign_leaderboard.total_participants', {
            count: totalParticipants.toLocaleString(),
          })}
        </Text>
      </Box>

      {/* Leaderboard list */}
      {entries.length > 0 ? (
        <Box
          twClassName="bg-muted rounded-xl overflow-hidden"
          testID={CAMPAIGN_LEADERBOARD_TEST_IDS.LIST}
        >
          <FlatList
            data={entries}
            renderItem={renderEntry}
            keyExtractor={keyExtractor}
            scrollEnabled={false}
            ItemSeparatorComponent={ListSeparator}
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
    </Box>
  );
};

export default OndoLeaderboard;
