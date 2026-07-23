import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
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
import {
  HYPERTRACKER_ATTRIBUTION_URL,
  PERPS_TRADING_MAX_WINNERS,
} from '../../utils/perpsCampaignConstants';
import HyperTrackerLogo from '../../../../../images/rewards/hypertracker.svg';
import { useTheme } from '../../../../../util/theme';
import { useCampaignLeaderboardEntries } from '../../hooks/useCampaignLeaderboardEntries';

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
  HYPERTRACKER_LOGO: 'perps-campaign-leaderboard-hypertracker-logo',
} as const;

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
  const navigation = useNavigation<AppNavigationProp>();
  const { colors } = useTheme();

  const handleHyperTrackerPress = useCallback(() => {
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: HYPERTRACKER_ATTRIBUTION_URL,
        timestamp: Date.now(),
      },
    });
  }, [navigation]);

  const { isPreview, showSplitView, visibleEntries } =
    useCampaignLeaderboardEntries({
      entries,
      maxEntries,
      userPosition,
    });

  const isCurrentUser = useCallback(
    (entry: PerpsTradingCampaignLeaderboardEntry) =>
      !!currentUserReferralCode &&
      entry.referralCode === currentUserReferralCode,
    [currentUserReferralCode],
  );

  if (isLoading && entries.length === 0) {
    return <CampaignLeaderboardSkeleton skeletonRowCount={maxEntries ?? 20} />;
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
            'rewards.perps_trading_campaign.stats_retry',
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
            entry={{ ...entry, qualified: true }}
            isCurrentUser={isCurrentUser(entry)}
            showCrown={!isPreview && entry.rank <= PERPS_TRADING_MAX_WINNERS}
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
                entry={{ ...entry, qualified: true }}
                isCurrentUser={isCurrentUser(entry)}
                showCrown={
                  !isPreview && entry.rank <= PERPS_TRADING_MAX_WINNERS
                }
                isCampaignComplete={isCampaignComplete}
                formatPrimaryMetric={(e) => formatSignedUsd(e.pnl)}
                isPositivePrimaryMetric={(e) => e.pnl >= 0}
              />
            ))}
          </>
        )}
      </Box>
      <Box
        twClassName="mt-4 px-4 w-full flex-row items-center"
        testID={PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS.POWERED_BY}
      >
        <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
          {strings(
            'rewards.perps_trading_campaign.leaderboard_powered_by_prefix',
          )}
        </Text>
        <Pressable
          accessibilityLabel={strings(
            'rewards.perps_trading_campaign.leaderboard_hypertracker_brand',
          )}
          accessibilityRole="button"
          onPress={handleHyperTrackerPress}
          testID={PERPS_CAMPAIGN_LEADERBOARD_TEST_IDS.HYPERTRACKER_LOGO}
        >
          <HyperTrackerLogo
            width={117}
            height={24}
            name="HyperTrackerLogo"
            color={colors.text.default}
          />
        </Pressable>
      </Box>
    </Box>
  );
};

export default PerpsTradingCampaignLeaderboard;
