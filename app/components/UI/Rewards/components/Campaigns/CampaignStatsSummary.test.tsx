import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampaignStatsSummary, {
  CAMPAIGN_STATS_SUMMARY_TEST_IDS,
} from './CampaignStatsSummary';
import type {
  CampaignLeaderboardPositionDto,
  OndoGmPortfolioSummaryDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      onConfirm,
      confirmButtonLabel,
      testID,
    }: {
      title: string;
      description: string;
      onConfirm?: () => void;
      confirmButtonLabel?: string;
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(Text, null, title),
        confirmButtonLabel &&
          ReactActual.createElement(
            Pressable,
            { onPress: onConfirm, testID: `${testID}-retry` },
            ReactActual.createElement(Text, null, confirmButtonLabel),
          ),
      ),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const t: Record<string, string> = {
      'rewards.ondo_campaign_leaderboard.tier_starter': 'Bronze',
      'rewards.ondo_campaign_leaderboard.tier_mid': 'Silver',
      'rewards.ondo_campaign_leaderboard.tier_upper': 'Platinum',
      'rewards.ondo_campaign_leaderboard.pending': 'Pending',
    };
    return t[key] ?? key;
  },
  default: { locale: 'en-US' },
}));

jest.mock('../../../../../util/formatFiat', () => ({
  __esModule: true,
  default: (amount: { toFixed: (dp: number) => string }) =>
    `$${Number(amount.toFixed(2)).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
}));

const MOCK_POSITION: CampaignLeaderboardPositionDto = {
  projectedTier: 'MID',
  rank: 5,
  totalInTier: 580,
  rateOfReturn: 0.152,
  currentUsdValue: 14250.75,
  totalUsdDeposited: 12000.0,
  netDeposit: 11500.0,
  qualifiedDays: 10,
  qualified: true,
  neighbors: [],
  computedAt: '2024-03-20T12:00:00.000Z',
};

const MOCK_SUMMARY: OndoGmPortfolioSummaryDto = {
  totalCurrentValue: '13057.575000',
  totalBookValue: '12202.500000',
  totalUsdDeposited: '12500.000000',
  netDeposit: '11500.000000',
  totalCashedOut: '1000.000000',
  portfolioPnl: '855.075000',
  portfolioPnlPercent: '0.0701',
};

const mockLeaderboardRefetch = jest.fn();
const mockPortfolioRefetch = jest.fn();

const baseProps = {
  leaderboardPosition: MOCK_POSITION as CampaignLeaderboardPositionDto | null,
  portfolioSummary: MOCK_SUMMARY as OndoGmPortfolioSummaryDto | null,
  leaderboard: {
    isLoading: false,
    hasError: false,
    refetch: mockLeaderboardRefetch,
  },
  portfolio: {
    isLoading: false,
    hasError: false,
    refetch: mockPortfolioRefetch,
  },
};

describe('CampaignStatsSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all stats when both position and summary are provided', () => {
    const { getByTestId } = render(<CampaignStatsSummary {...baseProps} />);

    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.CONTAINER),
    ).toBeDefined();
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RETURN).props.children,
    ).toBe('+15.20%');
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.MARKET_VALUE).props.children,
    ).toBe('$13,057.58');
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RANK).props.children,
    ).toBe('5');
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.TIER).props.children,
    ).toBe('Silver');
  });

  it('displays dash for return, rank, and tier when leaderboard position is null', () => {
    const { getByTestId } = render(
      <CampaignStatsSummary {...baseProps} leaderboardPosition={null} />,
    );

    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RETURN).props.children,
    ).toBe('-');
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RANK).props.children,
    ).toBe('-');
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.TIER).props.children,
    ).toBe('-');
  });

  it('displays dash for market value when portfolio summary is null', () => {
    const { getByTestId } = render(
      <CampaignStatsSummary {...baseProps} portfolioSummary={null} />,
    );

    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.MARKET_VALUE).props.children,
    ).toBe('-');
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RANK).props.children,
    ).toBe('5');
  });

  it('handles negative rate of return', () => {
    const negativePosition: CampaignLeaderboardPositionDto = {
      ...MOCK_POSITION,
      rateOfReturn: -0.05,
    };

    const { getByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboardPosition={negativePosition}
      />,
    );

    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RETURN).props.children,
    ).toBe('-5.00%');
  });

  it('renders Stats title', () => {
    const { getByText } = render(<CampaignStatsSummary {...baseProps} />);
    expect(getByText('Stats')).toBeDefined();
  });

  // ── Pending tag ──────────────────────────────────────────────────

  it('renders Pending tags next to rank and tier when qualified is false', () => {
    const pendingPosition: CampaignLeaderboardPositionDto = {
      ...MOCK_POSITION,
      qualified: false,
      qualifiedDays: 3,
    };

    const { getAllByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboardPosition={pendingPosition}
      />,
    );

    expect(
      getAllByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.PENDING_TAG),
    ).toHaveLength(2);
  });

  it('does not render Pending tags when qualified is true', () => {
    const { queryByTestId } = render(<CampaignStatsSummary {...baseProps} />);

    expect(
      queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.PENDING_TAG),
    ).toBeNull();
  });

  it('does not render Pending tags when leaderboardPosition is null', () => {
    const { queryByTestId } = render(
      <CampaignStatsSummary {...baseProps} leaderboardPosition={null} />,
    );

    expect(
      queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.PENDING_TAG),
    ).toBeNull();
  });

  // ── Leaderboard loading ───────────────────────────────────────────

  it('shows skeletons for leaderboard cells when leaderboard is loading with no data', () => {
    const { queryByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboardPosition={null}
        leaderboard={{ ...baseProps.leaderboard, isLoading: true }}
      />,
    );

    expect(queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RETURN)).toBeNull();
    expect(queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RANK)).toBeNull();
    expect(queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.TIER)).toBeNull();
    // Market value still renders since portfolio is fine
    expect(
      queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.MARKET_VALUE),
    ).toBeDefined();
  });

  it('shows stale leaderboard data instead of skeletons when loading with existing data', () => {
    const { getByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboard={{ ...baseProps.leaderboard, isLoading: true }}
      />,
    );

    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RETURN).props.children,
    ).toBe('+15.20%');
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RANK).props.children,
    ).toBe('5');
  });

  // ── Portfolio loading ─────────────────────────────────────────────

  it('shows skeleton for market value cell when portfolio is loading with no data', () => {
    const { queryByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        portfolioSummary={null}
        portfolio={{ ...baseProps.portfolio, isLoading: true }}
      />,
    );

    expect(
      queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.MARKET_VALUE),
    ).toBeNull();
    // Leaderboard cells still render
    expect(queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RETURN)).toBeDefined();
    expect(queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RANK)).toBeDefined();
  });

  it('shows stale market value data instead of skeleton when loading with existing data', () => {
    const { getByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        portfolio={{ ...baseProps.portfolio, isLoading: true }}
      />,
    );

    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.MARKET_VALUE).props.children,
    ).toBe('$13,057.58');
  });

  // ── Both loading ──────────────────────────────────────────────────

  it('shows all skeletons when both sources are loading with no data', () => {
    const { queryByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboardPosition={null}
        portfolioSummary={null}
        leaderboard={{ ...baseProps.leaderboard, isLoading: true }}
        portfolio={{ ...baseProps.portfolio, isLoading: true }}
      />,
    );

    expect(queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RETURN)).toBeNull();
    expect(
      queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.MARKET_VALUE),
    ).toBeNull();
    expect(queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RANK)).toBeNull();
    expect(queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.TIER)).toBeNull();
  });

  // ── Leaderboard error ─────────────────────────────────────────────

  it('shows leaderboard error banner when leaderboard fails with no data', () => {
    const { getByTestId, queryByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboardPosition={null}
        leaderboard={{ ...baseProps.leaderboard, hasError: true }}
      />,
    );

    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.LEADERBOARD_ERROR),
    ).toBeDefined();
    expect(
      queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.PORTFOLIO_ERROR),
    ).toBeNull();
  });

  it('calls leaderboard refetch on leaderboard error retry', () => {
    const { getByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboardPosition={null}
        leaderboard={{ ...baseProps.leaderboard, hasError: true }}
      />,
    );

    fireEvent.press(
      getByTestId(`${CAMPAIGN_STATS_SUMMARY_TEST_IDS.LEADERBOARD_ERROR}-retry`),
    );
    expect(mockLeaderboardRefetch).toHaveBeenCalledTimes(1);
    expect(mockPortfolioRefetch).not.toHaveBeenCalled();
  });

  it('hides leaderboard error when stale leaderboard data exists', () => {
    const { queryByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboard={{ ...baseProps.leaderboard, hasError: true }}
      />,
    );

    expect(
      queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.LEADERBOARD_ERROR),
    ).toBeNull();
  });

  // ── Portfolio error ───────────────────────────────────────────────

  it('shows portfolio error banner when portfolio fails with no data', () => {
    const { getByTestId, queryByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        portfolioSummary={null}
        portfolio={{ ...baseProps.portfolio, hasError: true }}
      />,
    );

    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.PORTFOLIO_ERROR),
    ).toBeDefined();
    expect(
      queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.LEADERBOARD_ERROR),
    ).toBeNull();
  });

  it('calls portfolio refetch on portfolio error retry', () => {
    const { getByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        portfolioSummary={null}
        portfolio={{ ...baseProps.portfolio, hasError: true }}
      />,
    );

    fireEvent.press(
      getByTestId(`${CAMPAIGN_STATS_SUMMARY_TEST_IDS.PORTFOLIO_ERROR}-retry`),
    );
    expect(mockPortfolioRefetch).toHaveBeenCalledTimes(1);
    expect(mockLeaderboardRefetch).not.toHaveBeenCalled();
  });

  // ── Both errors ───────────────────────────────────────────────────

  it('shows both error banners when both sources fail with no data', () => {
    const { getByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboardPosition={null}
        portfolioSummary={null}
        leaderboard={{ ...baseProps.leaderboard, hasError: true }}
        portfolio={{ ...baseProps.portfolio, hasError: true }}
      />,
    );

    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.LEADERBOARD_ERROR),
    ).toBeDefined();
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.PORTFOLIO_ERROR),
    ).toBeDefined();
  });
});
