import React from 'react';
import { render } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import PerpsTradingCampaignEndedStats from './PerpsTradingCampaignEndedStats';
import type {
  PerpsTradingCampaignLeaderboardDto,
  PerpsTradingCampaignLeaderboardEntry,
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
  formatCompactUsd: (value: number) => `$${(value / 1_000_000).toFixed(1)}M`,
  formatSignedUsd: (value: number) => {
    const sign = value >= 0 ? '+' : '-';
    const abs = Math.abs(value).toLocaleString();
    return `${sign}$${abs}`;
  },
}));

const makeEntry = (
  rank: number,
  pnl: number,
  volume = 30_000,
): PerpsTradingCampaignLeaderboardEntry => ({
  rank,
  referralCode: `T-${rank}`,
  pnl,
  volume,
});

const makeLeaderboard = (
  entriesCount: number,
  totalParticipants?: number,
  topPnl = 50_000,
): PerpsTradingCampaignLeaderboardDto => {
  const entries = Array.from({ length: entriesCount }, (_, i) =>
    makeEntry(i + 1, topPnl - i * 1000),
  );
  return {
    campaignId: 'perps-1',
    computedAt: '2026-01-01T00:00:00Z',
    totalParticipants: totalParticipants ?? entriesCount,
    minVolumeForEligibility: 25_000,
    entries,
  };
};

describe('PerpsTradingCampaignEndedStats', () => {
  beforeEach(() => {
    latestProps = null;
    jest.clearAllMocks();
  });

  it('maps perps leaderboard and volume into the generic ended stats props', () => {
    render(
      <PerpsTradingCampaignEndedStats
        leaderboard={makeLeaderboard(25, 200, 80_000)}
        totalNotionalVolume="27500000"
        isLeaderboardLoading={false}
        isVolumeLoading={false}
        hasLeaderboardError={false}
        hasVolumeError={false}
      />,
    );

    expect(latestProps).toMatchObject({
      totalParticipants: {
        label: 'rewards.campaign_ended_stats.total_participants',
        value: '200',
        isLoading: false,
      },
      totalVolume: {
        label: 'rewards.campaign_ended_stats.total_volume',
        value: '$27.5M',
        isLoading: false,
      },
      topMetric: {
        label: 'rewards.campaign_ended_stats.top_pnl',
        value: '+$80,000',
        isLoading: false,
      },
      totalWinners: {
        label: 'rewards.campaign_ended_stats.total_winners',
        value: '20',
        isLoading: false,
      },
      hasError: false,
    });
  });

  it('shows dash for winners when leaderboard has fewer than 20 entries', () => {
    render(
      <PerpsTradingCampaignEndedStats
        leaderboard={makeLeaderboard(15, 50)}
        totalNotionalVolume="1000000"
        isLeaderboardLoading={false}
        isVolumeLoading={false}
      />,
    );

    expect(latestProps?.totalWinners.value).toBe('-');
  });

  it('shows dashes when leaderboard and volume are null', () => {
    render(
      <PerpsTradingCampaignEndedStats
        leaderboard={null}
        totalNotionalVolume={null}
        isLeaderboardLoading={false}
        isVolumeLoading={false}
      />,
    );

    expect(latestProps).toMatchObject({
      totalParticipants: { value: '-', isLoading: false },
      totalVolume: { value: '-', isLoading: false },
      topMetric: { value: '-', isLoading: false },
      totalWinners: { value: '-', isLoading: false },
    });
  });

  it('shows loading state while uncached data is loading', () => {
    render(
      <PerpsTradingCampaignEndedStats
        leaderboard={null}
        totalNotionalVolume={null}
        isLeaderboardLoading
        isVolumeLoading
      />,
    );

    expect(latestProps).toMatchObject({
      totalParticipants: { value: '-', isLoading: true },
      totalVolume: { value: '-', isLoading: true },
      topMetric: { value: '-', isLoading: true },
      totalWinners: { value: '-', isLoading: true },
    });
  });

  it('handles a leaderboard with no entries', () => {
    const empty: PerpsTradingCampaignLeaderboardDto = {
      campaignId: 'perps-1',
      computedAt: '2026-01-01T00:00:00Z',
      totalParticipants: 0,
      minVolumeForEligibility: 25_000,
      entries: [],
    };

    render(
      <PerpsTradingCampaignEndedStats
        leaderboard={empty}
        totalNotionalVolume="0"
        isLeaderboardLoading={false}
        isVolumeLoading={false}
      />,
    );

    expect(latestProps).toMatchObject({
      totalParticipants: { value: '0' },
      topMetric: { value: '-' },
      totalWinners: { value: '-' },
    });
  });

  it('uses error color for negative top PnL', () => {
    const negativeTop: PerpsTradingCampaignLeaderboardDto = {
      campaignId: 'perps-1',
      computedAt: '2026-01-01T00:00:00Z',
      totalParticipants: 1,
      minVolumeForEligibility: 25_000,
      entries: [makeEntry(1, -5_000)],
    };

    render(
      <PerpsTradingCampaignEndedStats
        leaderboard={negativeTop}
        totalNotionalVolume="1000"
        isLeaderboardLoading={false}
        isVolumeLoading={false}
      />,
    );

    expect(latestProps?.topMetric.value).toBe('-$5,000');
    expect(latestProps?.topMetric.valueColor).toBe(TextColor.ErrorDefault);
  });

  it('shows error and retries both data sources when uncached data fails', () => {
    const onRetryLeaderboard = jest.fn();
    const onRetryVolume = jest.fn();

    render(
      <PerpsTradingCampaignEndedStats
        leaderboard={null}
        totalNotionalVolume={null}
        isLeaderboardLoading={false}
        isVolumeLoading={false}
        hasLeaderboardError
        hasVolumeError
        onRetryLeaderboard={onRetryLeaderboard}
        onRetryVolume={onRetryVolume}
      />,
    );

    expect(latestProps?.hasError).toBe(true);
    latestProps?.onRetry?.();
    expect(onRetryLeaderboard).toHaveBeenCalledTimes(1);
    expect(onRetryVolume).toHaveBeenCalledTimes(1);
  });

  it('shows error when only leaderboard fails while volume still renders', () => {
    render(
      <PerpsTradingCampaignEndedStats
        leaderboard={null}
        totalNotionalVolume="27500000"
        isLeaderboardLoading={false}
        isVolumeLoading={false}
        hasLeaderboardError
      />,
    );

    expect(latestProps?.hasError).toBe(true);
    expect(latestProps?.totalVolume.value).toBe('$27.5M');
  });

  it('does not show error when there are no errors', () => {
    render(
      <PerpsTradingCampaignEndedStats
        leaderboard={makeLeaderboard(25, 100, 10_000)}
        totalNotionalVolume="1000000"
        isLeaderboardLoading={false}
        isVolumeLoading={false}
        hasLeaderboardError={false}
        hasVolumeError={false}
      />,
    );

    expect(latestProps?.hasError).toBe(false);
  });
});
