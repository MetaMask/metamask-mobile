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
import type {
  CampaignLeaderboardEntry,
  CampaignLeaderboardPositionDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import RewardsErrorBanner from '../RewardsErrorBanner';

const TOP_N_ENTRIES = 20;

export const CAMPAIGN_LEADERBOARD_TEST_IDS = {
  CONTAINER: 'campaign-leaderboard-container',
  TIER_TOGGLE: 'campaign-leaderboard-tier-toggle',
  LIST: 'campaign-leaderboard-list',
  ENTRY_ROW: 'campaign-leaderboard-entry-row',
  MY_POSITION: 'campaign-leaderboard-my-position',
  MY_POSITION_CARD: 'campaign-leaderboard-my-position-card',
  COMPUTED_AT: 'campaign-leaderboard-computed-at',
  LOADING: 'campaign-leaderboard-loading',
  ERROR: 'campaign-leaderboard-error',
  POSITION_ERROR: 'campaign-leaderboard-position-error',
  EMPTY: 'campaign-leaderboard-empty',
} as const;

interface CampaignLeaderboardProps {
  tierNames: string[];
  selectedTier: string | null;
  onTierChange: (tier: string) => void;
  entries: CampaignLeaderboardEntry[];
  totalParticipants: number;
  myPosition: CampaignLeaderboardPositionDto | null;
  computedAt: string | null;
  isLoading: boolean;
  hasError: boolean;
  isPositionLoading: boolean;
  hasPositionError: boolean;
  onRetry?: () => void;
  onRetryPosition?: () => void;
}

/**
 * Formats the rate of return as a percentage string
 */
const formatRateOfReturn = (rate: number): string => {
  const percentage = rate * 100;
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(2)}%`;
};

/**
 * Formats the computed at timestamp to a human-readable string
 */
const formatComputedAt = (isoString: string | null): string => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'shortOffset',
    });
  } catch {
    return '';
  }
};

/**
 * Formats the referral code for display (no masking)
 */
const formatReferralCode = (code: string): string => code;

/**
 * LeaderboardEntryRow displays a single leaderboard entry
 * When isCurrentUser is true, highlights with success green text and muted background
 */
const LeaderboardEntryRow: React.FC<{
  entry: CampaignLeaderboardEntry;
  isCurrentUser?: boolean;
}> = ({ entry, isCurrentUser = false }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName={`py-3 px-4 ${isCurrentUser ? 'bg-success-muted' : ''}`}
    testID={`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-${entry.rank}`}
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-3"
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        twClassName="w-8"
        color={isCurrentUser ? TextColor.SuccessDefault : TextColor.TextDefault}
      >
        #{entry.rank}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={isCurrentUser ? TextColor.SuccessDefault : TextColor.TextDefault}
      >
        {formatReferralCode(entry.referral_code)}
      </Text>
    </Box>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={
        entry.rate_of_return >= 0
          ? TextColor.SuccessDefault
          : TextColor.ErrorDefault
      }
    >
      {formatRateOfReturn(entry.rate_of_return)}
    </Text>
  </Box>
);

/**
 * MyPositionRow displays the user's position using the same row style as leaderboard entries
 * Used above the leaderboard when user is not in top 20
 */
const MyPositionRow: React.FC<{
  position: CampaignLeaderboardPositionDto;
}> = ({ position }) => (
  <Box
    twClassName="bg-muted rounded-xl overflow-hidden mb-4"
    testID={CAMPAIGN_LEADERBOARD_TEST_IDS.MY_POSITION_CARD}
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="py-3 px-4 bg-success-muted"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-3"
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="w-8"
          color={TextColor.SuccessDefault}
        >
          #{position.rank}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.SuccessDefault}>
          {position.referral_code
            ? formatReferralCode(position.referral_code)
            : strings('rewards.leaderboard.your_position')}
        </Text>
      </Box>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={
          position.rate_of_return >= 0
            ? TextColor.SuccessDefault
            : TextColor.ErrorDefault
        }
      >
        {formatRateOfReturn(position.rate_of_return)}
      </Text>
    </Box>
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
 * ErrorBanner displays an error message with optional retry action
 */
const ErrorBanner: React.FC<{
  message: string;
  onRetry?: () => void;
  testID: string;
}> = ({ message, onRetry, testID }) => (
  <Box
    twClassName="bg-error-muted rounded-lg p-3 mb-4"
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    testID={testID}
  >
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.ErrorDefault}
      twClassName="flex-1"
    >
      {message}
    </Text>
    {onRetry && (
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.ErrorDefault}
        fontWeight={FontWeight.Medium}
        onPress={onRetry}
        twClassName="ml-2"
      >
        {strings('rewards.leaderboard.retry')}
      </Text>
    )}
  </Box>
);

/**
 * CampaignLeaderboard displays the leaderboard for a campaign with tier selection
 */
const CampaignLeaderboard: React.FC<CampaignLeaderboardProps> = ({
  tierNames,
  selectedTier,
  onTierChange,
  entries,
  totalParticipants,
  myPosition,
  computedAt,
  isLoading,
  hasError,
  isPositionLoading,
  hasPositionError,
  onRetry,
  onRetryPosition,
}) => {
  const tw = useTailwind();

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

  const isUserInSelectedTier =
    myPosition && myPosition.projected_tier === selectedTier;

  const isUserInTopN = isUserInSelectedTier && myPosition.rank <= TOP_N_ENTRIES;

  const isUserCurrentEntry = (entry: CampaignLeaderboardEntry): boolean => {
    if (!myPosition || !isUserInSelectedTier) return false;
    if (myPosition.referral_code) {
      return entry.referral_code === myPosition.referral_code;
    }
    return entry.rank === myPosition.rank;
  };

  const renderEntry = ({
    item,
  }: ListRenderItemInfo<CampaignLeaderboardEntry>) => (
    <LeaderboardEntryRow
      entry={item}
      isCurrentUser={isUserCurrentEntry(item)}
    />
  );

  const keyExtractor = (item: CampaignLeaderboardEntry) =>
    `${item.rank}-${item.referral_code}`;

  const anyLoading = isLoading || isPositionLoading;
  const hasAnyData = entries.length > 0 || myPosition !== null;

  if (anyLoading && !hasAnyData) {
    return <LeaderboardSkeleton />;
  }

  if (hasError && !hasAnyData) {
    return (
      <RewardsErrorBanner
        title={strings('rewards.leaderboard.error_loading')}
        description={strings('rewards.leaderboard.error_loading_description')}
        onConfirm={onRetry}
        confirmButtonLabel={strings('rewards.leaderboard.retry')}
        testID={CAMPAIGN_LEADERBOARD_TEST_IDS.ERROR}
      />
    );
  }

  if (tierNames.length === 0) {
    return (
      <Box
        twClassName="py-8 items-center"
        testID={CAMPAIGN_LEADERBOARD_TEST_IDS.EMPTY}
      >
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {strings('rewards.leaderboard.no_data')}
        </Text>
      </Box>
    );
  }

  return (
    <Box testID={CAMPAIGN_LEADERBOARD_TEST_IDS.CONTAINER}>
      {/* Header with tier toggle and computed at */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Center}
        twClassName="mb-4"
      >
        <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
          {strings('rewards.leaderboard.title')}
        </Text>
        {computedAt && (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={CAMPAIGN_LEADERBOARD_TEST_IDS.COMPUTED_AT}
          >
            {strings('rewards.leaderboard.updated_at', {
              time: formatComputedAt(computedAt),
            })}
          </Text>
        )}
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

      {/* Error banners */}
      {hasError && !isLoading && (
        <ErrorBanner
          message={strings('rewards.leaderboard.error_loading')}
          onRetry={onRetry}
          testID={CAMPAIGN_LEADERBOARD_TEST_IDS.ERROR}
        />
      )}
      {hasPositionError && !isPositionLoading && (
        <ErrorBanner
          message={strings('rewards.leaderboard.error_loading_position')}
          onRetry={onRetryPosition}
          testID={CAMPAIGN_LEADERBOARD_TEST_IDS.POSITION_ERROR}
        />
      )}

      {/* My position card - only shown when user is NOT in top N and is in selected tier */}
      {myPosition &&
        isUserInSelectedTier &&
        !isUserInTopN &&
        !isPositionLoading && <MyPositionRow position={myPosition} />}

      {/* Total participants */}
      <Box twClassName="mb-2">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('rewards.leaderboard.total_participants', {
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
            ItemSeparatorComponent={() => (
              <Box twClassName="border-b border-border-muted" />
            )}
          />
        </Box>
      ) : (
        <Box twClassName="py-8 items-center">
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('rewards.leaderboard.no_entries_in_tier')}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default CampaignLeaderboard;
