import React from 'react';
import { TextColor } from '@metamask/design-system-react-native';
import type { PredictThePitchLeaderboardPositionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import {
  formatPercentChange,
  formatRewardsTimeOnly,
} from '../../utils/formatUtils';
import CampaignLeaderboardStatsHeader from './CampaignLeaderboardStatsHeader';

export const PREDICT_THE_PITCH_STATS_HEADER_TEST_IDS = {
  CONTAINER: 'predict-the-pitch-stats-header-container',
  RANK_VALUE: 'predict-the-pitch-stats-header-rank',
  SUBTEXT_VALUE: 'predict-the-pitch-stats-header-roi',
  COMPUTED_AT: 'predict-the-pitch-stats-header-computed-at',
  PENDING_TAG: 'predict-the-pitch-stats-header-pending-tag',
  QUALIFIED_ICON: 'predict-the-pitch-stats-header-qualified-icon',
} as const;

interface PredictThePitchStatsHeaderProps {
  position: PredictThePitchLeaderboardPositionDto | null;
  isLoading?: boolean;
  showRoi?: boolean;
  showComputedAt?: boolean;
  isCampaignComplete?: boolean;
}

const PredictThePitchStatsHeader: React.FC<PredictThePitchStatsHeaderProps> = ({
  position,
  isLoading = false,
  showRoi = true,
  showComputedAt = true,
  isCampaignComplete = false,
}) => {
  const rank =
    position?.rank != null && Number.isFinite(position.rank)
      ? position.rank
      : null;
  const roi =
    position != null && Number.isFinite(position.roi) ? position.roi : null;

  const roiValue = roi != null ? formatPercentChange(roi) : '—';
  const roiColor =
    roi != null
      ? roi >= 0
        ? TextColor.SuccessDefault
        : TextColor.ErrorDefault
      : TextColor.TextDefault;

  const computedAtLabel = position?.computedAt
    ? strings('rewards.predict_the_pitch_campaign.last_updated', {
        time: formatRewardsTimeOnly(new Date(position.computedAt)),
      })
    : '';

  return (
    <CampaignLeaderboardStatsHeader
      title={strings('rewards.predict_the_pitch_campaign.label_your_rank')}
      rank={rank}
      isEligible={position?.eligible ?? null}
      isLoading={isLoading}
      subtextValue={roiValue}
      subtextColor={roiColor}
      computedAtLabel={computedAtLabel}
      showSubtext={showRoi}
      showComputedAt={showComputedAt}
      isCampaignComplete={isCampaignComplete}
      testIDs={PREDICT_THE_PITCH_STATS_HEADER_TEST_IDS}
    />
  );
};

export default PredictThePitchStatsHeader;
