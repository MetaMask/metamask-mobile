import React, { useMemo } from 'react';
import type { PredictThePitchPrizePoolDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import CampaignPrizePool, {
  CAMPAIGN_PRIZE_POOL_TEST_IDS,
  type CampaignPrizePoolMilestone,
} from './CampaignPrizePool';

export const PREDICT_THE_PITCH_PRIZE_POOL_TEST_IDS =
  CAMPAIGN_PRIZE_POOL_TEST_IDS;

interface PredictThePitchPrizePoolProps {
  prizePool: PredictThePitchPrizePoolDto | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => void;
}

const buildMilestones = (
  prizePool: PredictThePitchPrizePoolDto | null,
): CampaignPrizePoolMilestone[] => {
  if (!prizePool) {
    return [{ threshold: 0, prize: 0 }];
  }

  const milestones = prizePool.thresholdsUsd.map((threshold, index) => ({
    threshold,
    prize: prizePool.poolScheduleUsd[index] ?? prizePool.unlockedPoolUsd,
  }));

  if (!milestones.some((milestone) => milestone.threshold === 0)) {
    milestones.unshift({
      threshold: 0,
      prize: prizePool.poolScheduleUsd[0] ?? prizePool.unlockedPoolUsd,
    });
  }

  return milestones;
};

const PredictThePitchPrizePool: React.FC<PredictThePitchPrizePoolProps> = ({
  prizePool,
  isLoading,
  hasError,
  refetch,
}) => {
  const milestones = useMemo(() => buildMilestones(prizePool), [prizePool]);

  return (
    <CampaignPrizePool
      milestones={milestones}
      currentVolume={prizePool?.totalVolumeUsd ?? null}
      isLoading={isLoading}
      hasError={hasError}
      refetch={refetch}
    />
  );
};

export default PredictThePitchPrizePool;
