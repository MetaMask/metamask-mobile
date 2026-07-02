import React from 'react';
import { render } from '@testing-library/react-native';
import PredictThePitchCampaignEndedStats from './PredictThePitchCampaignEndedStats';
import type {
  PredictThePitchLeaderboardDto,
  PredictThePitchPrizePoolDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

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

jest.mock('./CampaignEndedStats', () => {
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

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../utils/formatUtils', () => ({
  formatCompactUsd: (value: number) => `compact-${value}`,
  formatPercentChange: (value: number) => `percent-${value}`,
}));

const leaderboard: PredictThePitchLeaderboardDto = {
  campaignId: 'predict-campaign-1',
  computedAt: '2025-01-01T00:00:00.000Z',
  totalParticipants: 1234,
  entries: [
    {
      rank: 1,
      referralCode: 'AAA',
      roi: 0.45,
    },
    {
      rank: 2,
      referralCode: 'BBB',
      roi: 0.2,
    },
  ],
};

const prizePool: PredictThePitchPrizePoolDto = {
  totalVolumeUsd: 5000000,
  unlockedPoolUsd: 10000,
  thresholdsUsd: [1000000, 5000000],
  poolScheduleUsd: [5000, 10000],
  breakdown: [
    { rank: 1, amountUsd: 7000 },
    { rank: 2, amountUsd: 3000 },
  ],
  computedAt: '2025-01-01T00:00:00.000Z',
};

describe('PredictThePitchCampaignEndedStats', () => {
  beforeEach(() => {
    latestProps = null;
    jest.clearAllMocks();
  });

  it('maps Predict leaderboard and prize pool into the generic ended stats props', () => {
    render(
      <PredictThePitchCampaignEndedStats
        leaderboard={leaderboard}
        prizePool={prizePool}
        isLeaderboardLoading={false}
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
        value: 'compact-5000000',
        isLoading: false,
      },
      topMetric: {
        label: 'rewards.campaign_ended_stats.top_return',
        value: 'percent-0.45',
        isLoading: false,
      },
      totalWinners: {
        label: 'rewards.campaign_ended_stats.total_winners',
        value: '2',
        isLoading: false,
      },
      hasError: undefined,
    });
  });

  it('shows loading and retries both data sources when uncached data fails', () => {
    const onRetryLeaderboard = jest.fn();
    const onRetryPrizePool = jest.fn();

    render(
      <PredictThePitchCampaignEndedStats
        leaderboard={null}
        prizePool={null}
        isLeaderboardLoading
        isPrizePoolLoading
        hasLeaderboardError
        hasPrizePoolError
        onRetryLeaderboard={onRetryLeaderboard}
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

    expect(onRetryLeaderboard).toHaveBeenCalledTimes(1);
    expect(onRetryPrizePool).toHaveBeenCalledTimes(1);
  });
});
