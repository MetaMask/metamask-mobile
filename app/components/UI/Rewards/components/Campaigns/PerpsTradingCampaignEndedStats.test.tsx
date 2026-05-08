import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsTradingCampaignEndedStats, {
  PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS,
} from './PerpsTradingCampaignEndedStats';
import type {
  PerpsTradingCampaignLeaderboardDto,
  PerpsTradingCampaignLeaderboardEntry,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: { title: string; onConfirm: () => void }) =>
      ReactActual.createElement(
        RN.View,
        { testID: 'rewards-error-banner' },
        ReactActual.createElement(RN.Text, null, props.title),
        ReactActual.createElement(RN.TouchableOpacity, {
          testID: 'rewards-error-banner-retry',
          onPress: props.onConfirm,
        }),
      ),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    ...actual,
    Text: (props: Record<string, unknown>) =>
      ReactActual.createElement(RN.Text, props, props.children),
    Skeleton: (props: Record<string, unknown>) =>
      ReactActual.createElement(RN.View, { testID: 'skeleton', ...props }),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

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
  qualified = true,
): PerpsTradingCampaignLeaderboardEntry => ({
  rank,
  referralCode: `T-${rank}`,
  pnl,
  qualified,
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
    entries,
  };
};

describe('PerpsTradingCampaignEndedStats', () => {
  it('renders all four stat cells with correct values when leaderboard has 20+ entries', () => {
    const { getByTestId } = render(
      <PerpsTradingCampaignEndedStats
        leaderboard={makeLeaderboard(25, 200, 80_000)}
        totalNotionalVolume="27500000"
        isLeaderboardLoading={false}
        isVolumeLoading={false}
      />,
    );

    expect(
      getByTestId(PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.CONTAINER),
    ).toBeTruthy();
    expect(
      getByTestId(PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_PARTICIPANTS).props
        .children,
    ).toBe((200).toLocaleString());
    expect(
      getByTestId(PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_VOLUME).props
        .children,
    ).toBe('$27.5M');
    expect(
      getByTestId(PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.TOP_PNL).props.children,
    ).toBe('+$80,000');
    // Leaderboard has 25 entries (>= 20) → fixed 20 winners
    expect(
      getByTestId(PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.WINNERS).props.children,
    ).toBe('20');
  });

  it('shows dash for winners when leaderboard has fewer than 20 entries', () => {
    const { getByTestId } = render(
      <PerpsTradingCampaignEndedStats
        leaderboard={makeLeaderboard(15, 50)}
        totalNotionalVolume="1000000"
        isLeaderboardLoading={false}
        isVolumeLoading={false}
      />,
    );

    expect(
      getByTestId(PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.WINNERS).props.children,
    ).toBe('-');
  });

  it('shows dashes when leaderboard and volume are null', () => {
    const { getByTestId } = render(
      <PerpsTradingCampaignEndedStats
        leaderboard={null}
        totalNotionalVolume={null}
        isLeaderboardLoading={false}
        isVolumeLoading={false}
      />,
    );

    expect(
      getByTestId(PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_PARTICIPANTS).props
        .children,
    ).toBe('-');
    expect(
      getByTestId(PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_VOLUME).props
        .children,
    ).toBe('-');
    expect(
      getByTestId(PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.TOP_PNL).props.children,
    ).toBe('-');
    expect(
      getByTestId(PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.WINNERS).props.children,
    ).toBe('-');
  });

  it('renders skeletons while data is loading', () => {
    const { getAllByTestId } = render(
      <PerpsTradingCampaignEndedStats
        leaderboard={null}
        totalNotionalVolume={null}
        isLeaderboardLoading
        isVolumeLoading
      />,
    );

    const skeletons = getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it('handles a leaderboard with no entries (no top PnL)', () => {
    const empty: PerpsTradingCampaignLeaderboardDto = {
      campaignId: 'perps-1',
      computedAt: '2026-01-01T00:00:00Z',
      totalParticipants: 0,
      entries: [],
    };

    const { getByTestId } = render(
      <PerpsTradingCampaignEndedStats
        leaderboard={empty}
        totalNotionalVolume="0"
        isLeaderboardLoading={false}
        isVolumeLoading={false}
      />,
    );

    expect(
      getByTestId(PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_PARTICIPANTS).props
        .children,
    ).toBe('0');
    expect(
      getByTestId(PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.TOP_PNL).props.children,
    ).toBe('-');
    expect(
      getByTestId(PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.WINNERS).props.children,
    ).toBe('-');
  });

  it('shows error banner when both sources fail and triggers both retries', () => {
    const onRetryLeaderboard = jest.fn();
    const onRetryVolume = jest.fn();

    const { getByTestId } = render(
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

    expect(getByTestId('rewards-error-banner')).toBeTruthy();
    fireEvent.press(getByTestId('rewards-error-banner-retry'));
    expect(onRetryLeaderboard).toHaveBeenCalledTimes(1);
    expect(onRetryVolume).toHaveBeenCalledTimes(1);
  });

  it('shows error banner when only leaderboard fails; volume still renders', () => {
    const { getByTestId } = render(
      <PerpsTradingCampaignEndedStats
        leaderboard={null}
        totalNotionalVolume="27500000"
        isLeaderboardLoading={false}
        isVolumeLoading={false}
        hasLeaderboardError
      />,
    );

    expect(getByTestId('rewards-error-banner')).toBeTruthy();
    expect(
      getByTestId(PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_VOLUME).props
        .children,
    ).toBe('$27.5M');
  });

  it('does not render error banner when there are no errors', () => {
    const { queryByTestId } = render(
      <PerpsTradingCampaignEndedStats
        leaderboard={makeLeaderboard(25, 100, 10_000)}
        totalNotionalVolume="1000000"
        isLeaderboardLoading={false}
        isVolumeLoading={false}
      />,
    );

    expect(queryByTestId('rewards-error-banner')).toBeNull();
  });

  it('renders negative top PnL with error color and a minus sign', () => {
    const negativeTop: PerpsTradingCampaignLeaderboardDto = {
      campaignId: 'perps-1',
      computedAt: '2026-01-01T00:00:00Z',
      totalParticipants: 1,
      entries: [makeEntry(1, -5_000)],
    };

    const { getByTestId } = render(
      <PerpsTradingCampaignEndedStats
        leaderboard={negativeTop}
        totalNotionalVolume="1000"
        isLeaderboardLoading={false}
        isVolumeLoading={false}
      />,
    );

    expect(
      getByTestId(PERPS_CAMPAIGN_ENDED_STATS_TEST_IDS.TOP_PNL).props.children,
    ).toBe('-$5,000');
  });
});
