import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import CampaignStatsSummary, {
  IneligibleTag,
  CAMPAIGN_STATS_SUMMARY_TEST_IDS,
} from './CampaignStatsSummary';
import type {
  CampaignLeaderboardPositionDto,
  OndoGmPortfolioSummaryDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    ...actual,
    Text: (props: Record<string, unknown>) =>
      ReactActual.createElement(RN.Text, props, props.children),
  };
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
      'rewards.ondo_campaign_leaderboard.qualified': 'Qualified',
      'rewards.ondo_campaign_leaderboard.ineligible': 'Ineligible',
      'rewards.ondo_campaign_stats.not_eligible_title': 'Not eligible',
      'rewards.ondo_campaign_stats.not_eligible_description':
        "Trades opened too late to meet the 10-day hold requirement won't count toward your rank or tier.",
      'rewards.ondo_campaign_stats.title': 'Stats',
      'rewards.ondo_campaign_stats.stats_error_title':
        'Unable to load all stats',
      'rewards.ondo_campaign_stats.stats_error_description':
        'We had a problem loading your stats. Please try again later.',
      'rewards.ondo_campaign_stats.retry': 'Retry',
      'rewards.ondo_campaign_stats.label_return': 'Return',
      'rewards.ondo_campaign_stats.label_market_value': 'Market Value',
      'rewards.ondo_campaign_stats.label_rank': 'Rank',
      'rewards.ondo_campaign_stats.label_tier': 'Tier',
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
    ).toBe('+7.01%');
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.MARKET_VALUE).props.children,
    ).toBe('$13,057.58');
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RANK).props.children,
    ).toBe('05');
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.TIER).props.children,
    ).toBe('Silver');
  });

  it('displays dash for rank and tier when leaderboard position is null but return from portfolio', () => {
    const { getByTestId } = render(
      <CampaignStatsSummary {...baseProps} leaderboardPosition={null} />,
    );

    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RETURN).props.children,
    ).toBe('+7.01%');
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RANK).props.children,
    ).toBe('-');
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.TIER).props.children,
    ).toBe('-');
  });

  it('displays dash for return when portfolio summary is null', () => {
    const { getByTestId } = render(
      <CampaignStatsSummary {...baseProps} portfolioSummary={null} />,
    );

    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RETURN).props.children,
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
    ).toBe('05');
  });

  it('uses error color for market value when return is negative', () => {
    const negativePortfolio: OndoGmPortfolioSummaryDto = {
      ...MOCK_SUMMARY,
      portfolioPnl: '-500.000000',
      portfolioPnlPercent: '-0.04',
    };

    const { getByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboardPosition={null}
        portfolioSummary={negativePortfolio}
      />,
    );

    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.MARKET_VALUE).props.color,
    ).toBe(TextColor.ErrorDefault);
  });

  it('uses success color for market value when portfolioPnl is positive', () => {
    const { getByTestId } = render(<CampaignStatsSummary {...baseProps} />);

    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.MARKET_VALUE).props.color,
    ).toBe(TextColor.SuccessDefault);
  });

  it('omits valueColor for market value when portfolioSummary is null', () => {
    const { getByTestId } = render(
      <CampaignStatsSummary {...baseProps} portfolioSummary={null} />,
    );

    // Returns '-' and uses the StatCell default color (TextDefault)
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.MARKET_VALUE).props.children,
    ).toBe('-');
  });

  it('handles negative rate of return from portfolio', () => {
    const negativeSummary: OndoGmPortfolioSummaryDto = {
      ...MOCK_SUMMARY,
      portfolioPnlPercent: '-0.05',
    };

    const { getByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        portfolioSummary={negativeSummary}
      />,
    );

    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RETURN).props.children,
    ).toBe('-5.00%');
  });

  it('renders Stats title by default', () => {
    const { getByText } = render(<CampaignStatsSummary {...baseProps} />);
    expect(getByText('Stats')).toBeDefined();
  });

  it('hides Stats title when showHeader is false', () => {
    const { queryByText } = render(
      <CampaignStatsSummary {...baseProps} showHeader={false} />,
    );
    expect(queryByText('Stats')).toBeNull();
  });

  // ── Pending / Qualified tags ────────────────────────────────────────

  it('renders Pending tag next to rank when qualified is false', () => {
    const pendingPosition: CampaignLeaderboardPositionDto = {
      ...MOCK_POSITION,
      qualified: false,
      qualifiedDays: 3,
    };

    const { getByTestId, getAllByText } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboardPosition={pendingPosition}
      />,
    );

    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.PENDING_TAG),
    ).toBeOnTheScreen();
    expect(getAllByText('Pending')).toHaveLength(1);
  });

  it('renders check icon on rank cell and no Pending tags when qualified is true', () => {
    const { getByTestId, queryAllByText, queryByTestId } = render(
      <CampaignStatsSummary {...baseProps} />,
    );

    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.QUALIFIED_TAG),
    ).toBeOnTheScreen();
    expect(queryAllByText('Pending')).toHaveLength(0);
    expect(
      queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.PENDING_TAG),
    ).toBeNull();
  });

  it('does not render tags when leaderboardPosition is null', () => {
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

    // Return and market value still render since portfolio is fine
    expect(queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RETURN)).toBeDefined();
    expect(queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RANK)).toBeNull();
    expect(queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.TIER)).toBeNull();
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
    ).toBe('+7.01%');
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RANK).props.children,
    ).toBe('05');
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
    // Return also shows skeleton since it now comes from portfolio
    expect(queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RETURN)).toBeNull();
    // Leaderboard cells still render
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

  it('shows stats error banner when leaderboard fails with no data', () => {
    const { getByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboardPosition={null}
        leaderboard={{ ...baseProps.leaderboard, hasError: true }}
      />,
    );

    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.STATS_ERROR),
    ).toBeDefined();
  });

  it('calls both refetches on stats error retry when leaderboard fails', () => {
    const { getByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboardPosition={null}
        leaderboard={{ ...baseProps.leaderboard, hasError: true }}
      />,
    );

    fireEvent.press(
      getByTestId(`${CAMPAIGN_STATS_SUMMARY_TEST_IDS.STATS_ERROR}-retry`),
    );
    expect(mockLeaderboardRefetch).toHaveBeenCalledTimes(1);
    expect(mockPortfolioRefetch).toHaveBeenCalledTimes(1);
  });

  it('hides stats error when stale leaderboard data exists', () => {
    const { queryByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboard={{ ...baseProps.leaderboard, hasError: true }}
      />,
    );

    expect(
      queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.STATS_ERROR),
    ).toBeNull();
  });

  // ── Portfolio error ───────────────────────────────────────────────

  it('shows stats error banner when portfolio fails with no data', () => {
    const { getByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        portfolioSummary={null}
        portfolio={{ ...baseProps.portfolio, hasError: true }}
      />,
    );

    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.STATS_ERROR),
    ).toBeDefined();
  });

  it('calls both refetches on stats error retry when portfolio fails', () => {
    const { getByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        portfolioSummary={null}
        portfolio={{ ...baseProps.portfolio, hasError: true }}
      />,
    );

    fireEvent.press(
      getByTestId(`${CAMPAIGN_STATS_SUMMARY_TEST_IDS.STATS_ERROR}-retry`),
    );
    expect(mockPortfolioRefetch).toHaveBeenCalledTimes(1);
    expect(mockLeaderboardRefetch).toHaveBeenCalledTimes(1);
  });

  // ── Both errors ───────────────────────────────────────────────────

  it('shows a single stats error banner when both sources fail with no data', () => {
    const { getAllByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboardPosition={null}
        portfolioSummary={null}
        leaderboard={{ ...baseProps.leaderboard, hasError: true }}
        portfolio={{ ...baseProps.portfolio, hasError: true }}
      />,
    );

    expect(
      getAllByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.STATS_ERROR),
    ).toHaveLength(1);
  });

  // ── Ineligible state ──────────────────────────────────────────────

  it('shows ineligible tag on rank cell when isIneligible=true', () => {
    const pendingPosition: CampaignLeaderboardPositionDto = {
      ...MOCK_POSITION,
      qualified: false,
      qualifiedDays: 0,
    };
    const { getByTestId, getAllByText } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboardPosition={pendingPosition}
        isIneligible
      />,
    );
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.INELIGIBLE_TAG),
    ).toBeOnTheScreen();
    expect(getAllByText('Ineligible')).toHaveLength(1);
  });

  it('shows dash for rank and tier when isIneligible=true even with leaderboard data', () => {
    const { getByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboardPosition={{
          ...MOCK_POSITION,
          rank: 5,
          projectedTier: 'MID',
        }}
        isIneligible
      />,
    );
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.RANK).props.children,
    ).toBe('-');
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.TIER).props.children,
    ).toBe('-');
  });

  it('shows not-eligible banner when isIneligible=true', () => {
    const { getByTestId, getByText } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboardPosition={{
          ...MOCK_POSITION,
          qualified: false,
          qualifiedDays: 0,
        }}
        isIneligible
      />,
    );
    expect(
      getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.NOT_ELIGIBLE_BANNER),
    ).toBeOnTheScreen();
    expect(getByText('Not eligible')).toBeOnTheScreen();
  });

  it('hides pending tags when isIneligible=true', () => {
    const { queryAllByText } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboardPosition={{
          ...MOCK_POSITION,
          qualified: false,
          qualifiedDays: 0,
        }}
        isIneligible
      />,
    );
    expect(queryAllByText('Pending')).toHaveLength(0);
  });

  it('does not show ineligible tags when isIneligible=false', () => {
    const { queryAllByText, queryByTestId } = render(
      <CampaignStatsSummary
        {...baseProps}
        leaderboardPosition={{
          ...MOCK_POSITION,
          qualified: false,
          qualifiedDays: 0,
        }}
        isIneligible={false}
      />,
    );
    expect(queryAllByText('Ineligible')).toHaveLength(0);
    expect(
      queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.NOT_ELIGIBLE_BANNER),
    ).toBeNull();
  });

  it('does not show not-eligible banner when isIneligible defaults to false', () => {
    const { queryByTestId } = render(<CampaignStatsSummary {...baseProps} />);
    expect(
      queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.NOT_ELIGIBLE_BANNER),
    ).toBeNull();
  });
});

describe('IneligibleTag', () => {
  it('renders ineligible label', () => {
    const { getByText } = render(<IneligibleTag />);
    expect(getByText('Ineligible')).toBeOnTheScreen();
  });

  it('passes testID through', () => {
    const { getByTestId } = render(
      <IneligibleTag testID="test-ineligible-tag" />,
    );
    expect(getByTestId('test-ineligible-tag')).toBeOnTheScreen();
  });
});
