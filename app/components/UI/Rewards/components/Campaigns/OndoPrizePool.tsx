import React, { useMemo } from 'react';
import {
  CAMPAIGN_PRIZE_POOL_TEST_IDS,
  type CampaignPrizePoolSchedule,
} from './CampaignPrizePool';
import CampaignPrizePoolSection from './CampaignPrizePoolSection';

export const ONDO_PRIZE_POOL_TEST_IDS = CAMPAIGN_PRIZE_POOL_TEST_IDS;

export const BREAKPOINTS = [
  { deposit: 0, prize: 25_000 },
  { deposit: 1_500_000, prize: 50_000 },
  { deposit: 3_500_000, prize: 75_000 },
  { deposit: 6_000_000, prize: 100_000 },
] as const;

const ONDO_PRIZE_POOL_SCHEDULE: Omit<
  CampaignPrizePoolSchedule,
  'totalVolumeUsd'
> = {
  unlockedPoolUsd: BREAKPOINTS[BREAKPOINTS.length - 1].prize,
  thresholdsUsd: BREAKPOINTS.map((breakpoint) => breakpoint.deposit),
  poolScheduleUsd: BREAKPOINTS.map((breakpoint) => breakpoint.prize),
};

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
}) => {
  const prizePool = useMemo(
    (): CampaignPrizePoolSchedule | null =>
      totalUsdDeposited == null
        ? null
        : {
            ...ONDO_PRIZE_POOL_SCHEDULE,
            totalVolumeUsd: Number.parseFloat(totalUsdDeposited),
          },
    [totalUsdDeposited],
  );

  return (
    <CampaignPrizePoolSection
      prizePool={prizePool}
      isLoading={isLoading}
      hasError={hasError}
      refetch={refetch}
    />
  );
};

export default OndoPrizePool;
