import React, { useMemo } from 'react';
import type { PerpsTradingCampaignPrizePoolDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import CampaignPrizePool, {
  CAMPAIGN_PRIZE_POOL_TEST_IDS,
  type CampaignPrizePoolMilestone,
} from './CampaignPrizePool';

export const PERPS_PRIZE_POOL_TEST_IDS = CAMPAIGN_PRIZE_POOL_TEST_IDS;

const buildMilestones = (
  prizePool: PerpsTradingCampaignPrizePoolDto | null,
): CampaignPrizePoolMilestone[] => {
  if (!prizePool) {
    return [];
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

interface PerpsTradingCampaignPrizePoolProps {
  prizePool: PerpsTradingCampaignPrizePoolDto | null;
  totalNotionalVolume: string | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => void;
}

const PerpsTradingCampaignPrizePool: React.FC<
  PerpsTradingCampaignPrizePoolProps
> = ({ prizePool, totalNotionalVolume, isLoading, hasError, refetch }) => {
  const milestones = useMemo(() => buildMilestones(prizePool), [prizePool]);

  return (
    <CampaignPrizePool
      milestones={milestones}
      currentVolume={
        totalNotionalVolume == null
          ? null
          : Number.parseFloat(totalNotionalVolume)
      }
      isLoading={isLoading}
      hasError={hasError}
      refetch={refetch}
    />
  );
};

export default PerpsTradingCampaignPrizePool;
