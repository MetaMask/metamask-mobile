import React from 'react';
import CampaignPrizePool, {
  CAMPAIGN_PRIZE_POOL_TEST_IDS,
  type CampaignPrizePoolMilestone,
} from './CampaignPrizePool';

export const ONDO_PRIZE_POOL_TEST_IDS = CAMPAIGN_PRIZE_POOL_TEST_IDS;

export const BREAKPOINTS = [
  { deposit: 0, prize: 25_000 },
  { deposit: 1_500_000, prize: 50_000 },
  { deposit: 3_500_000, prize: 75_000 },
  { deposit: 6_000_000, prize: 100_000 },
] as const;

const ONDO_PRIZE_POOL_MILESTONES: CampaignPrizePoolMilestone[] =
  BREAKPOINTS.map((breakpoint) => ({
    threshold: breakpoint.deposit,
    prize: breakpoint.prize,
  }));

interface OndoPrizePoolProps {
  totalUsdDeposited: string | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => void;
}

const OndoPrizePool: React.FC<OndoPrizePoolProps> = ({
  totalUsdDeposited,
  isLoading,
  hasError,
  refetch,
}) => (
  <CampaignPrizePool
    milestones={ONDO_PRIZE_POOL_MILESTONES}
    currentVolume={
      totalUsdDeposited == null ? null : Number.parseFloat(totalUsdDeposited)
    }
    isLoading={isLoading}
    hasError={hasError}
    refetch={refetch}
  />
);

export default OndoPrizePool;
