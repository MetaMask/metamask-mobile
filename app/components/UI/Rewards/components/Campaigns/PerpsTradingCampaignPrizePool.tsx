import React from 'react';
import CampaignPrizePool, {
  CAMPAIGN_PRIZE_POOL_TEST_IDS,
  type CampaignPrizePoolMilestone,
} from './CampaignPrizePool';

export const PERPS_PRIZE_POOL_TEST_IDS = CAMPAIGN_PRIZE_POOL_TEST_IDS;

// $10k base prize, scales by $5k per $5M notional volume, up to $50k at $40M
export const PERPS_PRIZE_POOL_MILESTONES = [
  { notionalVolume: 0, prize: 10_000 },
  { notionalVolume: 5_000_000, prize: 15_000 },
  { notionalVolume: 10_000_000, prize: 20_000 },
  { notionalVolume: 15_000_000, prize: 25_000 },
  { notionalVolume: 20_000_000, prize: 30_000 },
  { notionalVolume: 25_000_000, prize: 35_000 },
  { notionalVolume: 30_000_000, prize: 40_000 },
  { notionalVolume: 35_000_000, prize: 45_000 },
  { notionalVolume: 40_000_000, prize: 50_000 },
] as const;

const PERPS_PRIZE_POOL_GENERIC_MILESTONES: CampaignPrizePoolMilestone[] =
  PERPS_PRIZE_POOL_MILESTONES.map((milestone) => ({
    threshold: milestone.notionalVolume,
    prize: milestone.prize,
  }));

interface PerpsTradingCampaignPrizePoolProps {
  totalNotionalVolume: string | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => void;
}

const PerpsTradingCampaignPrizePool: React.FC<
  PerpsTradingCampaignPrizePoolProps
> = ({ totalNotionalVolume, isLoading, hasError, refetch }) => (
  <CampaignPrizePool
    milestones={PERPS_PRIZE_POOL_GENERIC_MILESTONES}
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

export default PerpsTradingCampaignPrizePool;
