import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampaignEndedStats, {
  CAMPAIGN_ENDED_STATS_TEST_IDS,
} from './CampaignEndedStats';
import type { CampaignLeaderboardDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

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

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../utils/formatUtils', () => ({
  formatCompactUsd: (value: number) => `$${(value / 1_000_000).toFixed(1)}M`,
  formatPercentChange: (value: number) => {
    const pct = value * 100;
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  },
}));

const makeLeaderboard = (
  overrides?: Partial<CampaignLeaderboardDto>,
): CampaignLeaderboardDto => ({
  campaignId: 'campaign-1',
  computedAt: '2024-01-01T00:00:00Z',
  tiers: {
    STARTER: {
      totalParticipants: 10000,
      entries: [
        {
          rank: 1,
          referralCode: 'A',
          rateOfReturn: 0.847,
          qualifiedDays: 10,
          qualified: true,
        },
        {
          rank: 2,
          referralCode: 'B',
          rateOfReturn: 0.5,
          qualifiedDays: 10,
          qualified: true,
        },
        {
          rank: 3,
          referralCode: 'C',
          rateOfReturn: 0.2,
          qualifiedDays: 5,
          qualified: false,
        },
      ],
    },
    MID: {
      totalParticipants: 4312,
      entries: [
        {
          rank: 1,
          referralCode: 'D',
          rateOfReturn: 0.6,
          qualifiedDays: 10,
          qualified: true,
        },
        {
          rank: 2,
          referralCode: 'E',
          rateOfReturn: 0.3,
          qualifiedDays: 8,
          qualified: false,
        },
      ],
    },
  },
  ...overrides,
});

describe('CampaignEndedStats', () => {
  it('renders all four stat cells with correct values', () => {
    const { getByTestId } = render(
      <CampaignEndedStats
        leaderboard={makeLeaderboard()}
        totalUsdDeposited="6800000"
        isLeaderboardLoading={false}
        isDepositsLoading={false}
      />,
    );

    expect(getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.CONTAINER)).toBeTruthy();
    // Total participants: 10000 + 4312 = 14312
    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_PARTICIPANTS).props
        .children,
    ).toBe((14312).toLocaleString());
    // Total TVL: $6.8M
    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_TVL).props.children,
    ).toBe('$6.8M');
    // Top return: max(0.847, 0.5, 0.2, 0.6, 0.3) = 0.847 → +84.70%
    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.TOP_RETURN).props.children,
    ).toBe('+84.70%');
    // Winners: qualified entries across all tiers = A, B, D = 3
    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.WINNERS).props.children,
    ).toBe('3');
  });

  it('shows dashes when leaderboard is null and deposits are null', () => {
    const { getByTestId } = render(
      <CampaignEndedStats
        leaderboard={null}
        totalUsdDeposited={null}
        isLeaderboardLoading={false}
        isDepositsLoading={false}
      />,
    );

    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_PARTICIPANTS).props
        .children,
    ).toBe('-');
    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_TVL).props.children,
    ).toBe('-');
    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.TOP_RETURN).props.children,
    ).toBe('-');
    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.WINNERS).props.children,
    ).toBe('-');
  });

  it('renders skeletons while leaderboard is loading', () => {
    const { getAllByTestId } = render(
      <CampaignEndedStats
        leaderboard={null}
        totalUsdDeposited={null}
        isLeaderboardLoading
        isDepositsLoading
      />,
    );

    const skeletons = getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it('caps winners at 5 per tier even when more qualified entries exist', () => {
    const makeEntry = (rank: number, referralCode: string) => ({
      rank,
      referralCode,
      rateOfReturn: 0.1,
      qualifiedDays: 10,
      qualified: true,
    });
    const leaderboard = makeLeaderboard({
      tiers: {
        STARTER: {
          totalParticipants: 100,
          entries: [1, 2, 3, 4, 5, 6, 7].map((r) => makeEntry(r, `S${r}`)),
        },
        MID: {
          totalParticipants: 50,
          entries: [1, 2, 3].map((r) => makeEntry(r, `M${r}`)),
        },
      },
    });

    const { getByTestId } = render(
      <CampaignEndedStats
        leaderboard={leaderboard}
        totalUsdDeposited={null}
        isLeaderboardLoading={false}
        isDepositsLoading={false}
      />,
    );

    // STARTER has 7 qualified but caps at 5; MID has 3 qualified → total 8
    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.WINNERS).props.children,
    ).toBe('8');
  });

  it('handles an empty leaderboard with no entries', () => {
    const emptyLeaderboard = makeLeaderboard({
      tiers: {
        STARTER: { totalParticipants: 0, entries: [] },
      },
    });

    const { getByTestId } = render(
      <CampaignEndedStats
        leaderboard={emptyLeaderboard}
        totalUsdDeposited={null}
        isLeaderboardLoading={false}
        isDepositsLoading={false}
      />,
    );

    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_PARTICIPANTS).props
        .children,
    ).toBe('0');
    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.TOP_RETURN).props.children,
    ).toBe('-');
    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.WINNERS).props.children,
    ).toBe('0');
  });

  it('shows error banner when both sources fail', () => {
    const onRetryLeaderboard = jest.fn();
    const onRetryDeposits = jest.fn();

    const { getByTestId } = render(
      <CampaignEndedStats
        leaderboard={null}
        totalUsdDeposited={null}
        isLeaderboardLoading={false}
        isDepositsLoading={false}
        hasLeaderboardError
        hasDepositsError
        onRetryLeaderboard={onRetryLeaderboard}
        onRetryDeposits={onRetryDeposits}
      />,
    );

    expect(getByTestId('rewards-error-banner')).toBeTruthy();
    fireEvent.press(getByTestId('rewards-error-banner-retry'));
    expect(onRetryLeaderboard).toHaveBeenCalledTimes(1);
    expect(onRetryDeposits).toHaveBeenCalledTimes(1);
  });

  it('shows error banner when only leaderboard fails, TVL still renders', () => {
    const { getByTestId } = render(
      <CampaignEndedStats
        leaderboard={null}
        totalUsdDeposited="6800000"
        isLeaderboardLoading={false}
        isDepositsLoading={false}
        hasLeaderboardError
      />,
    );

    expect(getByTestId('rewards-error-banner')).toBeTruthy();
    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_TVL).props.children,
    ).toBe('$6.8M');
  });

  it('shows error banner when only deposits fail, leaderboard stats still render', () => {
    const { getByTestId } = render(
      <CampaignEndedStats
        leaderboard={makeLeaderboard()}
        totalUsdDeposited={null}
        isLeaderboardLoading={false}
        isDepositsLoading={false}
        hasDepositsError
      />,
    );

    expect(getByTestId('rewards-error-banner')).toBeTruthy();
    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_PARTICIPANTS).props
        .children,
    ).toBe((14312).toLocaleString());
  });

  it('does not show error banner when there are no errors', () => {
    const { queryByTestId } = render(
      <CampaignEndedStats
        leaderboard={makeLeaderboard()}
        totalUsdDeposited="6800000"
        isLeaderboardLoading={false}
        isDepositsLoading={false}
        hasLeaderboardError={false}
        hasDepositsError={false}
      />,
    );

    expect(queryByTestId('rewards-error-banner')).toBeNull();
  });
});
