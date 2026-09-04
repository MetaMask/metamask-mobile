import React, { useMemo } from 'react';
import type { PerpsTradingCampaignPrizePoolDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import CampaignPrizePool, {
  CAMPAIGN_PRIZE_POOL_TEST_IDS,
  type CampaignPrizePoolMilestone,
} from './CampaignPrizePool';

export const PERPS_PRIZE_POOL_TEST_IDS = CAMPAIGN_PRIZE_POOL_TEST_IDS;

/**
 * Ladder used before per-campaign config existed: $10k base prize, scaling by
 * $5k per $5M notional volume up to $50k at $40M. The backend now serves this
 * per campaign; this stays as the fallback so the section keeps rendering
 * against deployments that predate the prize-pool endpoint.
 */
export const PERPS_PRIZE_POOL_FALLBACK_MILESTONES: CampaignPrizePoolMilestone[] =
  [
    { threshold: 0, prize: 10_000 },
    { threshold: 5_000_000, prize: 15_000 },
    { threshold: 10_000_000, prize: 20_000 },
    { threshold: 15_000_000, prize: 25_000 },
    { threshold: 20_000_000, prize: 30_000 },
    { threshold: 25_000_000, prize: 35_000 },
    { threshold: 30_000_000, prize: 40_000 },
    { threshold: 35_000_000, prize: 45_000 },
    { threshold: 40_000_000, prize: 50_000 },
  ];

const buildMilestones = (
  prizePool: PerpsTradingCampaignPrizePoolDto | null,
): CampaignPrizePoolMilestone[] => {
  if (!prizePool || prizePool.thresholdsUsd.length === 0) {
    return PERPS_PRIZE_POOL_FALLBACK_MILESTONES;
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
