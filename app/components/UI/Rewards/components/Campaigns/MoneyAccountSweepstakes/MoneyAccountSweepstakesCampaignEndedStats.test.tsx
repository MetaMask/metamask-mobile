import React from 'react';
import { render } from '@testing-library/react-native';
import MoneyAccountSweepstakesCampaignEndedStats from './MoneyAccountSweepstakesCampaignEndedStats';
import type {
  MoneyAccountSweepstakesPrizePoolDto,
  MoneyAccountSweepstakesVolumeStatsDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';

interface CapturedEndedStatsProps {
  totalParticipants: { label: string; value: string; isLoading?: boolean };
  totalVolume: { label: string; value: string; isLoading?: boolean };
  topMetric: {
    label: string;
    value: string;
    isLoading?: boolean;
    valueColor?: unknown;
  };
  totalWinners: { label: string; value: string; isLoading?: boolean };
  hasError?: boolean;
  onRetry?: () => void;
}

let latestProps: CapturedEndedStatsProps | null = null;

jest.mock('../CampaignEndedStats', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: CapturedEndedStatsProps) => {
      latestProps = props;
      return ReactActual.createElement(View, {
        testID: 'campaign-ended-stats',
      });
    },
  };
});

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../utils/formatUtils', () => ({
  formatCompactUsd: (value: number) => `compact-${value}`,
}));

const volumeStats: MoneyAccountSweepstakesVolumeStatsDto = {
  totalVolumeUsd: 3000000,
  eligibleParticipantCount: 1234,
  yieldEarnedUsd: 8123.55,
};

const prizePool: MoneyAccountSweepstakesPrizePoolDto = {
  totalVolumeUsd: 3000000,
  unlockedPoolUsd: 15000,
  thresholdsUsd: [0, 2000000, 3000000],
  poolScheduleUsd: [5000, 10000, 15000],
  numberOfWinners: 10,
  minPrizeUsd: 50,
  maxPrizeUsd: 5000,
};

describe('MoneyAccountSweepstakesCampaignEndedStats', () => {
  beforeEach(() => {
    latestProps = null;
    jest.clearAllMocks();
  });

  it('maps volume stats and prize pool into the generic ended stats props', () => {
    render(
      <MoneyAccountSweepstakesCampaignEndedStats
        volumeStats={volumeStats}
        prizePool={prizePool}
        isVolumeStatsLoading={false}
        isPrizePoolLoading={false}
      />,
    );

    expect(latestProps).toMatchObject({
      totalParticipants: {
        label: 'rewards.campaign_ended_stats.total_participants',
        value: '1,234',
        isLoading: false,
      },
      totalVolume: {
        label: 'rewards.campaign_ended_stats.total_volume',
        value: 'compact-3000000',
        isLoading: false,
      },
      topMetric: {
        label: 'rewards.campaign_ended_stats.total_yield',
        value: 'compact-8123.55',
        isLoading: false,
      },
      totalWinners: {
        label: 'rewards.campaign_ended_stats.total_winners',
        value: '10',
        isLoading: false,
      },
      hasError: undefined,
    });
  });

  it('shows loading and retries both data sources when uncached data fails', () => {
    const onRetryVolumeStats = jest.fn();
    const onRetryPrizePool = jest.fn();

    render(
      <MoneyAccountSweepstakesCampaignEndedStats
        volumeStats={null}
        prizePool={null}
        isVolumeStatsLoading
        isPrizePoolLoading
        hasVolumeStatsError
        hasPrizePoolError
        onRetryVolumeStats={onRetryVolumeStats}
        onRetryPrizePool={onRetryPrizePool}
      />,
    );

    expect(latestProps).toMatchObject({
      totalParticipants: { value: '-', isLoading: true },
      totalVolume: { value: '-', isLoading: true },
      topMetric: { value: '-', isLoading: true },
      totalWinners: { value: '-', isLoading: true },
      hasError: true,
    });

    latestProps?.onRetry?.();

    expect(onRetryVolumeStats).toHaveBeenCalledTimes(1);
    expect(onRetryPrizePool).toHaveBeenCalledTimes(1);
  });
});
