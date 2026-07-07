import React from 'react';
import {
  Box,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type {
  CampaignParticipantOutcomeStatus,
  PredictThePitchLeaderboardPositionDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import {
  formatPercentChange,
  formatRewardsTimeOnly,
  formatSignedUsd,
  formatUsd,
} from '../../utils/formatUtils';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { CampaignOutcomeBanner } from './CampaignOutcomeBanners';
import { PendingTag, StatCell } from './OndoCampaignStatsSummary';

export const PREDICT_THE_PITCH_STATS_SUMMARY_TEST_IDS = {
  CONTAINER: 'predict-the-pitch-stats-summary-container',
  RANK: 'predict-the-pitch-stats-summary-rank',
  ROI: 'predict-the-pitch-stats-summary-roi',
  TOTAL_VOLUME: 'predict-the-pitch-stats-summary-total-volume',
  PNL: 'predict-the-pitch-stats-summary-pnl',
  MARKETS_TRADED: 'predict-the-pitch-stats-summary-markets-traded',
  PENDING_TAG: 'predict-the-pitch-stats-summary-pending-tag',
  QUALIFIED_TAG: 'predict-the-pitch-stats-summary-qualified-tag',
  STATS_ERROR: 'predict-the-pitch-stats-summary-error',
} as const;

interface PredictThePitchStatsSummaryProps {
  leaderboardPosition: PredictThePitchLeaderboardPositionDto | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => void;
  isCampaignComplete?: boolean;
  outcomeStatus?: CampaignParticipantOutcomeStatus;
  winnerVerificationCode?: string | null;
  onWinnerPress?: () => void;
}

const getMetricColor = (value: number | null): TextColor => {
  if (value == null) {
    return TextColor.TextDefault;
  }
  return value >= 0 ? TextColor.SuccessDefault : TextColor.ErrorDefault;
};

const PredictThePitchStatsSummary: React.FC<
  PredictThePitchStatsSummaryProps
> = ({
  leaderboardPosition,
  isLoading,
  hasError,
  refetch,
  isCampaignComplete = false,
  outcomeStatus,
  winnerVerificationCode,
  onWinnerPress,
}) => {
  const showSkeleton = isLoading && !leaderboardPosition;
  const showError = hasError && !leaderboardPosition;

  const rank =
    leaderboardPosition?.rank != null &&
    Number.isFinite(leaderboardPosition.rank) &&
    leaderboardPosition.rank > 0
      ? leaderboardPosition.rank
      : null;
  const roi =
    leaderboardPosition != null && Number.isFinite(leaderboardPosition.roi)
      ? leaderboardPosition.roi
      : null;
  const volume =
    leaderboardPosition != null && Number.isFinite(leaderboardPosition.volume)
      ? leaderboardPosition.volume
      : null;
  const pnl =
    leaderboardPosition != null && Number.isFinite(leaderboardPosition.pnl)
      ? leaderboardPosition.pnl
      : null;

  const isPending =
    leaderboardPosition != null && !leaderboardPosition.eligible;
  const isQualified =
    leaderboardPosition != null && leaderboardPosition.eligible;

  const marketsTraded = leaderboardPosition?.marketsTraded ?? null;
  const minimumMarketsTraded =
    leaderboardPosition?.minimumMarketsTraded ?? null;
  const showMarketsTraded =
    marketsTraded != null && minimumMarketsTraded != null;
  const marketsDisplay = showMarketsTraded
    ? marketsTraded < minimumMarketsTraded
      ? `${marketsTraded}/${minimumMarketsTraded}`
      : String(marketsTraded)
    : '';

  const rankDisplay = rank != null ? String(rank).padStart(2, '0') : '-';
  const roiDisplay = roi != null ? formatPercentChange(roi) : '-';
  const volumeDisplay = volume != null ? formatUsd(volume) : '-';
  const pnlDisplay = pnl != null ? formatSignedUsd(pnl) : '-';

  return (
    <Box
      twClassName="gap-3"
      testID={PREDICT_THE_PITCH_STATS_SUMMARY_TEST_IDS.CONTAINER}
    >
      {showError && (
        <RewardsErrorBanner
          title={strings(
            'rewards.predict_the_pitch_campaign.stats_error_title',
          )}
          description={strings(
            'rewards.predict_the_pitch_campaign.stats_error_description',
          )}
          onConfirm={refetch}
          confirmButtonLabel={strings(
            'rewards.predict_the_pitch_campaign.stats_retry',
          )}
          testID={PREDICT_THE_PITCH_STATS_SUMMARY_TEST_IDS.STATS_ERROR}
        />
      )}

      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label={strings('rewards.predict_the_pitch_campaign.label_rank')}
          value={rankDisplay}
          isLoading={showSkeleton}
          testID={PREDICT_THE_PITCH_STATS_SUMMARY_TEST_IDS.RANK}
          suffix={
            !isCampaignComplete && isPending ? (
              <PendingTag
                testID={PREDICT_THE_PITCH_STATS_SUMMARY_TEST_IDS.PENDING_TAG}
              />
            ) : isQualified ? (
              <Icon
                name={IconName.Check}
                size={IconSize.Sm}
                color={IconColor.SuccessDefault}
                testID={PREDICT_THE_PITCH_STATS_SUMMARY_TEST_IDS.QUALIFIED_TAG}
              />
            ) : undefined
          }
        />
        <StatCell
          label={strings('rewards.predict_the_pitch_campaign.label_roi')}
          value={roiDisplay}
          isLoading={showSkeleton}
          valueColor={getMetricColor(roi)}
          testID={PREDICT_THE_PITCH_STATS_SUMMARY_TEST_IDS.ROI}
        />
      </Box>
      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label={strings(
            'rewards.predict_the_pitch_campaign.label_total_volume',
          )}
          value={volumeDisplay}
          isLoading={showSkeleton}
          testID={PREDICT_THE_PITCH_STATS_SUMMARY_TEST_IDS.TOTAL_VOLUME}
        />
        <StatCell
          label={strings('rewards.predict_the_pitch_campaign.label_pnl')}
          value={pnlDisplay}
          isLoading={showSkeleton}
          valueColor={getMetricColor(pnl)}
          testID={PREDICT_THE_PITCH_STATS_SUMMARY_TEST_IDS.PNL}
        />
      </Box>
      {showMarketsTraded && (
        <Box flexDirection={BoxFlexDirection.Row}>
          <StatCell
            label={strings(
              'rewards.predict_the_pitch_campaign.label_markets_traded',
            )}
            value={marketsDisplay}
            isLoading={showSkeleton}
            testID={PREDICT_THE_PITCH_STATS_SUMMARY_TEST_IDS.MARKETS_TRADED}
          />
        </Box>
      )}

      {leaderboardPosition?.computedAt && (
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('rewards.predict_the_pitch_campaign.last_updated', {
            time: formatRewardsTimeOnly(
              new Date(leaderboardPosition.computedAt),
            ),
          })}
        </Text>
      )}

      {isCampaignComplete && outcomeStatus != null && onWinnerPress != null && (
        <CampaignOutcomeBanner
          outcomeStatus={outcomeStatus}
          winnerVerificationCode={winnerVerificationCode ?? null}
          onWinnerPress={onWinnerPress}
        />
      )}
    </Box>
  );
};

export default PredictThePitchStatsSummary;
