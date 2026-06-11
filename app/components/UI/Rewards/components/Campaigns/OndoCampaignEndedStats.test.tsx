import React from 'react';
import { render } from '@testing-library/react-native';
import OndoCampaignEndedStats from './OndoCampaignEndedStats';
import type { CampaignLeaderboardDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

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

const makeLeaderboard = (): CampaignLeaderboardDto => ({
  campaignId: 'ondo-campaign-1',
  computedAt: '2025-01-01T00:00:00.000Z',
  tiers: {
    STARTER: {
      totalParticipants: 10,
      entries: [1, 2, 3, 4, 5, 6].map((rank) => ({
        rank,
        referralCode: `S${rank}`,
        rateOfReturn: rank === 6 ? 0.25 : 0.1,
        qualifiedDays: 10,
        qualified: true,
      })),
    },
    MID: {
      totalParticipants: 5,
      entries: [
        {
          rank: 1,
          referralCode: 'M1',
          rateOfReturn: 0.15,
          qualifiedDays: 10,
          qualified: true,
        },
      ],
    },
  },
});

describe('OndoCampaignEndedStats', () => {
  beforeEach(() => {
    latestProps = null;
    jest.clearAllMocks();
  });

  it('maps Ondo leaderboard and deposits into the generic ended stats props', () => {
    render(
      <OndoCampaignEndedStats
        leaderboard={makeLeaderboard()}
        totalUsdDeposited="6800000"
        isLeaderboardLoading={false}
        isDepositsLoading={false}
      />,
    );

    expect(latestProps).toMatchObject({
      totalParticipants: {
        label: 'rewards.campaign_ended_stats.total_participants',
        value: '15',
        isLoading: false,
      },
      totalVolume: {
        label: 'rewards.campaign_ended_stats.total_volume',
        value: 'compact-6800000',
        isLoading: false,
      },
      topMetric: {
        label: 'rewards.campaign_ended_stats.top_return',
        value: 'percent-0.25',
        isLoading: false,
      },
      totalWinners: {
        label: 'rewards.campaign_ended_stats.total_winners',
        value: '6',
        isLoading: false,
      },
      hasError: undefined,
    });
  });

  it('shows loading and retries both data sources when uncached data fails', () => {
    const onRetryLeaderboard = jest.fn();
    const onRetryDeposits = jest.fn();

    render(
      <OndoCampaignEndedStats
        leaderboard={null}
        totalUsdDeposited={null}
        isLeaderboardLoading
        isDepositsLoading
        hasLeaderboardError
        hasDepositsError
        onRetryLeaderboard={onRetryLeaderboard}
        onRetryDeposits={onRetryDeposits}
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
    expect(onRetryDeposits).toHaveBeenCalledTimes(1);
  });
});
