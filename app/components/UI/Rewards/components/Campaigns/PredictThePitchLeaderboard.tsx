import React, { useCallback } from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { PredictThePitchLeaderboardEntryDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { formatPercentChange } from '../../utils/formatUtils';
import {
  CampaignLeaderboardEntryRow,
  CampaignLeaderboardNeighborSeparator,
  CampaignLeaderboardSkeleton,
  CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS,
} from './CampaignLeaderboard';
import { useCampaignLeaderboardEntries } from '../../hooks/useCampaignLeaderboardEntries';
import { PREDICT_THE_PITCH_CAMPAIGN_MAX_WINNERS } from '../../utils/predictCampaignConstants';

export const PREDICT_THE_PITCH_LEADERBOARD_TEST_IDS = {
  CONTAINER: 'predict-the-pitch-leaderboard-container',
  LIST: 'predict-the-pitch-leaderboard-list',
  ENTRY_ROW: CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.ENTRY_ROW,
  PENDING_TAG: CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.PENDING_TAG,
  NEIGHBOR_SEPARATOR: CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.NEIGHBOR_SEPARATOR,
  LOADING: CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.LOADING,
  ERROR: 'predict-the-pitch-leaderboard-error',
  EMPTY: 'predict-the-pitch-leaderboard-empty',
  NOT_YET_COMPUTED: 'predict-the-pitch-leaderboard-not-yet-computed',
  TOTAL_PARTICIPANTS: 'predict-the-pitch-leaderboard-total-participants',
} as const;

interface UserPosition {
  rank: number;
  neighbors: PredictThePitchLeaderboardEntryDto[];
}

interface PredictThePitchLeaderboardProps {
  entries: PredictThePitchLeaderboardEntryDto[];
  isLoading: boolean;
  hasError: boolean;
  isLeaderboardNotYetComputed?: boolean;
  onRetry?: () => void;
  currentUserReferralCode?: string | null;
  maxEntries?: number;
  userPosition?: UserPosition | null;
  isCampaignComplete?: boolean;
  isCurrentUserEligible?: boolean;
}

const PredictThePitchLeaderboard: React.FC<PredictThePitchLeaderboardProps> = ({
  entries,
  isLoading,
  hasError,
  isLeaderboardNotYetComputed = false,
  onRetry,
  currentUserReferralCode,
  maxEntries,
  userPosition,
  isCampaignComplete = false,
  isCurrentUserEligible,
}) => {
  const { isPreview, showSplitView, visibleEntries } =
    useCampaignLeaderboardEntries({
      entries,
      maxEntries,
      userPosition,
    });

  const isCurrentUser = useCallback(
    (entry: PredictThePitchLeaderboardEntryDto) =>
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
            'rewards.predict_the_pitch_campaign.leaderboard_error_loading',
          )}
          description={strings(
            'rewards.predict_the_pitch_campaign.leaderboard_error_loading_description',
          )}
          onConfirm={onRetry}
          confirmButtonLabel={strings(
            'rewards.predict_the_pitch_campaign.stats_retry',
          )}
          testID={PREDICT_THE_PITCH_LEADERBOARD_TEST_IDS.ERROR}
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
          testID={PREDICT_THE_PITCH_LEADERBOARD_TEST_IDS.NOT_YET_COMPUTED}
        >
          {strings(
            'rewards.predict_the_pitch_campaign.leaderboard_not_yet_computed',
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
          testID={PREDICT_THE_PITCH_LEADERBOARD_TEST_IDS.EMPTY}
        >
          {strings(
            'rewards.predict_the_pitch_campaign.leaderboard_not_yet_computed',
          )}
        </Text>
      </Box>
    );
  }

  return (
    <Box testID={PREDICT_THE_PITCH_LEADERBOARD_TEST_IDS.CONTAINER}>
      <Box testID={PREDICT_THE_PITCH_LEADERBOARD_TEST_IDS.LIST}>
        {visibleEntries.map((entry) => {
          const currentUser = isCurrentUser(entry);
          return (
            <CampaignLeaderboardEntryRow
              key={`${entry.rank}-${entry.referralCode}`}
              entry={{
                ...entry,
                qualified: currentUser ? (isCurrentUserEligible ?? true) : true,
              }}
              isCurrentUser={currentUser}
              showCrown={
                !isPreview &&
                entry.rank <= PREDICT_THE_PITCH_CAMPAIGN_MAX_WINNERS
              }
              isCampaignComplete={isCampaignComplete}
              formatPrimaryMetric={(e) => formatPercentChange(e.roi)}
              isPositivePrimaryMetric={(e) => e.roi >= 0}
            />
          );
        })}
        {showSplitView && userPosition && (
          <>
            <CampaignLeaderboardNeighborSeparator />
            {userPosition.neighbors.map((entry) => {
              const currentUser = isCurrentUser(entry);
              return (
                <CampaignLeaderboardEntryRow
                  key={`neighbor-${entry.rank}-${entry.referralCode}`}
                  entry={{
                    ...entry,
                    qualified: currentUser
                      ? (isCurrentUserEligible ?? true)
                      : true,
                  }}
                  isCurrentUser={currentUser}
                  showCrown={
                    !isPreview &&
                    entry.rank <= PREDICT_THE_PITCH_CAMPAIGN_MAX_WINNERS
                  }
                  isCampaignComplete={isCampaignComplete}
                  formatPrimaryMetric={(e) => formatPercentChange(e.roi)}
                  isPositivePrimaryMetric={(e) => e.roi >= 0}
                />
              );
            })}
          </>
        )}
      </Box>
    </Box>
  );
};

export default PredictThePitchLeaderboard;
