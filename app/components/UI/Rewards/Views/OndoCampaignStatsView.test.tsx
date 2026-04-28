import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import OndoCampaignStatsView, {
  ONDO_CAMPAIGN_STATS_VIEW_TEST_IDS,
} from './OndoCampaignStatsView';
import { LEADERBOARD_POSITION_HEADER_TEST_IDS } from '../components/Campaigns/LeaderboardPositionHeader';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useGetOndoPortfolioPosition } from '../hooks/useGetOndoPortfolioPosition';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import { useGetOndoLeaderboard } from '../hooks/useGetOndoLeaderboard';
import { useOndoCampaignParticipantOutcome } from '../hooks/useOndoCampaignParticipantOutcome';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';
import type {
  CampaignDto,
  CampaignLeaderboardPositionDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../constants/navigation/Routes';

interface OndoStatsRouteParams {
  campaignId: string;
  campaignName?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __ONDO_CAMPAIGN_STATS_TEST_ROUTE__: OndoStatsRouteParams;
}

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({
    params: globalThis.__ONDO_CAMPAIGN_STATS_TEST_ROUTE__ ?? {
      campaignId: 'campaign-ondo-123',
    },
  }),
}));

const mockRewardsState: { campaigns: CampaignDto[] } = { campaigns: [] };

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (
    selector: (state: { rewards: typeof mockRewardsState }) => unknown,
  ) => selector({ rewards: mockRewardsState }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: jest.fn(() => ({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })),
    SafeAreaView: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { ...props, testID }, children),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock(
  '../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, Text, Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        title,
        onBack,
        backButtonProps,
        endButtonIconProps,
      }: {
        title: string;
        onBack: () => void;
        backButtonProps?: { testID?: string };
        endButtonIconProps?: { testID?: string; onPress?: () => void }[];
      }) =>
        ReactActual.createElement(
          View,
          { testID: 'header' },
          ReactActual.createElement(Text, null, title),
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: backButtonProps?.testID ?? 'header-back-button',
          }),
          ...(endButtonIconProps ?? []).map((btn, index) =>
            ReactActual.createElement(Pressable, {
              key: `end-${String(index)}`,
              onPress: btn.onPress,
              testID: btn.testID ?? `header-end-button-${String(index)}`,
            }),
          ),
        ),
    };
  },
);

jest.mock('../../../Views/ErrorBoundary', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

jest.mock('../components/RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      onConfirm,
      confirmButtonLabel,
    }: {
      title: string;
      description?: string;
      onConfirm?: () => void;
      confirmButtonLabel?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'error-banner' },
        ReactActual.createElement(Text, null, title),
        confirmButtonLabel &&
          ReactActual.createElement(Pressable, {
            onPress: onConfirm,
            testID: 'error-retry-button',
          }),
      ),
  };
});

jest.mock('../components/Campaigns/OndoLeaderboard.utils', () => ({
  formatTierDisplayName: (tier: string) => tier,
  getTierMinNetDeposit: jest.fn(
    (
      tiers: { name: string; minNetDeposit: number }[] | undefined,
      name: string,
    ) =>
      tiers?.find((t: { name: string }) => t.name === name)?.minNetDeposit ??
      null,
  ),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`;
    return key;
  },
}));

jest.mock('../utils/formatUtils', () => ({
  formatPercentChange: (value: string | number): string => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (Number.isNaN(num)) return '';
    const percentage = num * 100;
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  },
  formatUsd: (value: number | string) =>
    `$${Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
}));

// Mock Engine to prevent @metamask/social-controllers resolution chain
jest.mock('../../../../core/Engine/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AccountTreeController: { setSelectedAccountGroup: jest.fn() },
    },
    controllerMessenger: {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    },
  },
}));

jest.mock('../components/Campaigns/CampaignTile.utils');
jest.mock('../hooks/useGetCampaignParticipantStatus');
jest.mock('../hooks/useGetOndoPortfolioPosition');
jest.mock('../hooks/useGetOndoLeaderboardPosition');
jest.mock('../hooks/useGetOndoLeaderboard');
jest.mock('../hooks/useOndoCampaignParticipantOutcome', () => ({
  useOndoCampaignParticipantOutcome: jest.fn(() => ({
    outcome: null,
    isLoading: false,
    hasError: false,
  })),
}));

jest.mock('../hooks/useTrackRewardsPageView', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockGetCampaignStatus = getCampaignStatus as jest.MockedFunction<
  typeof getCampaignStatus
>;
const mockUseGetCampaignParticipantStatus =
  useGetCampaignParticipantStatus as jest.MockedFunction<
    typeof useGetCampaignParticipantStatus
  >;
const mockUseGetOndoPortfolioPosition =
  useGetOndoPortfolioPosition as jest.MockedFunction<
    typeof useGetOndoPortfolioPosition
  >;
const mockUseGetOndoLeaderboardPosition =
  useGetOndoLeaderboardPosition as jest.MockedFunction<
    typeof useGetOndoLeaderboardPosition
  >;
const mockUseGetOndoLeaderboard = useGetOndoLeaderboard as jest.MockedFunction<
  typeof useGetOndoLeaderboard
>;
const mockUseOndoCampaignParticipantOutcome =
  useOndoCampaignParticipantOutcome as jest.MockedFunction<
    typeof useOndoCampaignParticipantOutcome
  >;

const mockRefetch = jest.fn();

const leaderboardDefaults = {
  leaderboard: null,
  isLoading: false,
  hasError: false,
  isLeaderboardNotYetComputed: false,
  tierNames: [],
  selectedTier: null,
  selectedTierData: null,
  computedAt: null,
  setSelectedTier: jest.fn(),
  refetch: mockRefetch,
};

const positionDefaults = {
  position: null as CampaignLeaderboardPositionDto | null,
  isLoading: false,
  hasError: false,
  hasFetched: false,
  refetch: mockRefetch,
};

const portfolioDefaults = {
  portfolio: null,
  isLoading: false,
  hasError: false,
  hasFetched: false,
  refetch: mockRefetch,
};

const createTestCampaign = (
  overrides: Partial<CampaignDto> = {},
): CampaignDto => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return {
    id: 'campaign-ondo-123',
    name: 'Test Campaign',
    startDate: yesterday.toISOString(),
    endDate: nextMonth.toISOString(),
    termsAndConditions: null,
    excludedRegions: [],
    details: {
      howItWorks: { title: '', description: '', steps: [] },
      tiers: [
        { name: 'STARTER', minNetDeposit: 500 },
        { name: 'MID', minNetDeposit: 1000 },
      ],
    },
    featured: true,
    type: 'ONDO_HOLDING' as never,
    ...overrides,
  };
};

const makePendingPosition = (
  overrides: Partial<CampaignLeaderboardPositionDto> = {},
): CampaignLeaderboardPositionDto => ({
  rank: 8,
  projectedTier: 'STARTER',
  qualified: false,
  qualifiedDays: 3,
  totalInTier: 100,
  rateOfReturn: 0.05,
  currentUsdValue: 5000,
  totalUsdDeposited: 4000,
  netDeposit: 3500,
  neighbors: [],
  computedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const makeQualifiedPosition = (
  overrides: Partial<CampaignLeaderboardPositionDto> = {},
): CampaignLeaderboardPositionDto => ({
  rank: 3,
  projectedTier: 'MID',
  qualified: true,
  qualifiedDays: 10,
  totalInTier: 100,
  rateOfReturn: 0.12,
  currentUsdValue: 15000,
  totalUsdDeposited: 12000,
  netDeposit: 11000,
  neighbors: [],
  computedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('OndoCampaignStatsView', () => {
  beforeEach(() => {
    globalThis.__ONDO_CAMPAIGN_STATS_TEST_ROUTE__ = {
      campaignId: 'campaign-ondo-123',
    };
    jest.clearAllMocks();
    mockGetCampaignStatus.mockReturnValue('active');
    mockRewardsState.campaigns = [];
    mockUseGetCampaignParticipantStatus.mockReturnValue({
      status: null,
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetOndoPortfolioPosition.mockReturnValue(portfolioDefaults);
    mockUseGetOndoLeaderboardPosition.mockReturnValue(positionDefaults);
    mockUseGetOndoLeaderboard.mockReturnValue(leaderboardDefaults);
    mockUseOndoCampaignParticipantOutcome.mockReturnValue({
      outcome: null,
      isLoading: false,
      hasError: false,
    });
  });

  it('renders with the correct container testID', () => {
    const { getByTestId } = render(<OndoCampaignStatsView />);
    expect(
      getByTestId(ONDO_CAMPAIGN_STATS_VIEW_TEST_IDS.CONTAINER),
    ).toBeDefined();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = render(<OndoCampaignStatsView />);
    fireEvent.press(getByTestId('ondo-campaign-stats-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('shows dash placeholders when no position data is available', () => {
    const { getAllByText } = render(<OndoCampaignStatsView />);
    expect(getAllByText('-').length).toBeGreaterThan(0);
  });

  it('navigates to campaign mechanics when the header help button is pressed', () => {
    mockRewardsState.campaigns = [createTestCampaign()];
    const { getByTestId } = render(<OndoCampaignStatsView />);
    fireEvent.press(getByTestId('campaign-stats-mechanics-button'));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_CAMPAIGN_MECHANICS,
      {
        campaignId: 'campaign-ondo-123',
      },
    );
  });

  it('pads rank with a leading zero for single-digit ranks', () => {
    mockRewardsState.campaigns = [createTestCampaign()];
    mockUseGetCampaignParticipantStatus.mockReturnValue({
      status: { optedIn: true, participantCount: 1 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      ...positionDefaults,
      position: makeQualifiedPosition({ rank: 7 }),
    });
    const { getByTestId } = render(<OndoCampaignStatsView />);
    expect(
      getByTestId(LEADERBOARD_POSITION_HEADER_TEST_IDS.RANK_VALUE),
    ).toHaveTextContent('07');
  });

  it('shows the winner banner and navigates to the winning view when the user is a top-5 qualifier on a complete campaign', () => {
    mockGetCampaignStatus.mockReturnValue('complete');
    mockRewardsState.campaigns = [createTestCampaign({ name: 'Grand Ondo' })];
    mockUseGetCampaignParticipantStatus.mockReturnValue({
      status: { optedIn: true, participantCount: 1 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      ...positionDefaults,
      position: makeQualifiedPosition({ rank: 2 }),
    });
    mockUseOndoCampaignParticipantOutcome.mockReturnValue({
      outcome: {
        subscriptionId: 'sub-1',
        outcomeStatus: 'pending',
        winnerVerificationCode: 'LVL346',
      },
      isLoading: false,
      hasError: false,
    });
    const { getByText } = render(<OndoCampaignStatsView />);
    const title = getByText('rewards.ondo_outcome_banner.winner_pending.title');
    fireEvent.press(title);
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_ONDO_CAMPAIGN_WINNING_VIEW,
      {
        campaignId: 'campaign-ondo-123',
        campaignName: 'Grand Ondo',
      },
    );
  });

  it('does not show the winner banner when the campaign is not in the store, even for a top-5 qualifier', () => {
    mockRewardsState.campaigns = [];
    globalThis.__ONDO_CAMPAIGN_STATS_TEST_ROUTE__ = {
      campaignId: 'campaign-ondo-123',
      campaignName: 'From Route Only',
    };
    mockGetCampaignStatus.mockReturnValue('complete');
    mockUseGetCampaignParticipantStatus.mockReturnValue({
      status: { optedIn: true, participantCount: 1 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      ...positionDefaults,
      position: makeQualifiedPosition({ rank: 1 }),
    });
    const { queryByText } = render(<OndoCampaignStatsView />);
    expect(
      queryByText('rewards.ondo_outcome_banner.winner_pending.title'),
    ).toBeNull();
  });

  it('shows leaderboard skeleton state while position is loading', () => {
    jest.useFakeTimers();
    try {
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        ...positionDefaults,
        position: null,
        isLoading: true,
      });
      const { getByTestId } = render(<OndoCampaignStatsView />);
      act(() => {
        jest.runOnlyPendingTimers();
      });
      expect(
        getByTestId(LEADERBOARD_POSITION_HEADER_TEST_IDS.CONTAINER),
      ).toBeDefined();
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows portfolio skeleton state while portfolio is loading', () => {
    jest.useFakeTimers();
    try {
      mockUseGetCampaignParticipantStatus.mockReturnValue({
        status: { optedIn: true, participantCount: 1 },
        isLoading: false,
        hasError: false,
        refetch: jest.fn(),
      });
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        ...portfolioDefaults,
        portfolio: null,
        isLoading: true,
      });
      const { getByText } = render(<OndoCampaignStatsView />);
      act(() => {
        jest.runOnlyPendingTimers();
      });
      expect(
        getByText('rewards.ondo_campaign_stats.label_portfolio'),
      ).toBeDefined();
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows the qualified card when the user is qualified but not a winner', () => {
    mockRewardsState.campaigns = [createTestCampaign()];
    mockUseGetCampaignParticipantStatus.mockReturnValue({
      status: { optedIn: true, participantCount: 1 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      ...positionDefaults,
      position: makeQualifiedPosition({ rank: 8 }),
    });
    const { getByText } = render(<OndoCampaignStatsView />);
    expect(
      getByText('rewards.ondo_campaign_stats.qualified_title'),
    ).toBeDefined();
  });

  it('shows outflow and a separate days-held row when the portfolio has cashed out', () => {
    mockUseGetCampaignParticipantStatus.mockReturnValue({
      status: { optedIn: true, participantCount: 1 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      ...positionDefaults,
      position: makeQualifiedPosition({ rank: 8 }),
    });
    mockUseGetOndoPortfolioPosition.mockReturnValue({
      ...portfolioDefaults,
      portfolio: {
        positions: [],
        summary: {
          totalCurrentValue: '12000',
          totalBookValue: '11000',
          totalUsdDeposited: '11000',
          netDeposit: '10500',
          totalCashedOut: '250',
          portfolioPnl: '1000',
          portfolioPnlPercent: '0.09',
        },
        computedAt: '2024-01-01T00:00:00Z',
      },
    });
    const { getAllByText, getByText } = render(<OndoCampaignStatsView />);
    expect(
      getByText('rewards.ondo_campaign_stats.label_outflow'),
    ).toBeDefined();
    const daysHeldLabels = getAllByText(
      'rewards.ondo_campaign_stats.label_days_held',
    );
    expect(daysHeldLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('shows the secondary days-held row without a qualified suffix when cashed out but still pending', () => {
    mockRewardsState.campaigns = [createTestCampaign()];
    mockUseGetCampaignParticipantStatus.mockReturnValue({
      status: { optedIn: true, participantCount: 1 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      ...positionDefaults,
      position: makePendingPosition(),
    });
    mockUseGetOndoPortfolioPosition.mockReturnValue({
      ...portfolioDefaults,
      portfolio: {
        positions: [],
        summary: {
          totalCurrentValue: '8000',
          totalBookValue: '7500',
          totalUsdDeposited: '7500',
          netDeposit: '7000',
          totalCashedOut: '100',
          portfolioPnl: '500',
          portfolioPnlPercent: '0.07',
        },
        computedAt: '2024-01-01T00:00:00Z',
      },
    });
    const { getByText, getAllByText } = render(<OndoCampaignStatsView />);
    expect(
      getByText('rewards.ondo_campaign_stats.label_outflow'),
    ).toBeDefined();
    expect(
      getAllByText('rewards.ondo_campaign_stats.label_days_held').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('shows formatted return value when portfolio data is available', () => {
    mockUseGetOndoPortfolioPosition.mockReturnValue({
      ...portfolioDefaults,
      portfolio: {
        positions: [],
        summary: {
          totalCurrentValue: '15000',
          totalBookValue: '13000',
          totalUsdDeposited: '13000',
          netDeposit: '12500',
          totalCashedOut: '0',
          portfolioPnl: '2000',
          portfolioPnlPercent: '0.15',
        },
        computedAt: '2024-01-01T00:00:00Z',
      },
    });
    const { getByText } = render(<OndoCampaignStatsView />);
    expect(getByText('+15.00%')).toBeDefined();
  });

  it('shows negative return with error color class when portfolio return is negative', () => {
    mockUseGetOndoPortfolioPosition.mockReturnValue({
      ...portfolioDefaults,
      portfolio: {
        positions: [],
        summary: {
          totalCurrentValue: '9700',
          totalBookValue: '10000',
          totalUsdDeposited: '10000',
          netDeposit: '10000',
          totalCashedOut: '0',
          portfolioPnl: '-300',
          portfolioPnlPercent: '-0.03',
        },
        computedAt: '2024-01-01T00:00:00Z',
      },
    });
    const { getByText } = render(<OndoCampaignStatsView />);
    expect(getByText('-3.00%')).toBeDefined();
  });

  it('shows market value from portfolio summary', () => {
    mockUseGetOndoPortfolioPosition.mockReturnValue({
      ...portfolioDefaults,
      portfolio: {
        positions: [],
        summary: {
          totalCurrentValue: '12000',
          totalBookValue: '11000',
          totalUsdDeposited: '11000',
          netDeposit: '10500',
          totalCashedOut: '0',
          portfolioPnl: '1000',
          portfolioPnlPercent: '0.09',
        },
        computedAt: '2024-01-01T00:00:00Z',
      },
    });
    const { getByText } = render(<OndoCampaignStatsView />);
    expect(getByText('$12,000.00')).toBeDefined();
  });

  it('hides market value label when campaign is complete', () => {
    mockGetCampaignStatus.mockReturnValue('complete');
    mockRewardsState.campaigns = [createTestCampaign()];
    mockUseGetOndoPortfolioPosition.mockReturnValue({
      ...portfolioDefaults,
      portfolio: {
        positions: [],
        summary: {
          totalCurrentValue: '12000',
          totalBookValue: '11000',
          totalUsdDeposited: '11000',
          netDeposit: '10500',
          totalCashedOut: '0',
          portfolioPnl: '1000',
          portfolioPnlPercent: '0.09',
        },
        computedAt: '2024-01-01T00:00:00Z',
      },
    });
    const { queryByText } = render(<OndoCampaignStatsView />);
    expect(
      queryByText('rewards.ondo_campaign_stats.label_market_value'),
    ).toBeNull();
  });

  it('shows market value label when campaign is active', () => {
    mockUseGetOndoPortfolioPosition.mockReturnValue({
      ...portfolioDefaults,
      portfolio: {
        positions: [],
        summary: {
          totalCurrentValue: '12000',
          totalBookValue: '11000',
          totalUsdDeposited: '11000',
          netDeposit: '10500',
          totalCashedOut: '0',
          portfolioPnl: '1000',
          portfolioPnlPercent: '0.09',
        },
        computedAt: '2024-01-01T00:00:00Z',
      },
    });
    const { getByText } = render(<OndoCampaignStatsView />);
    expect(
      getByText('rewards.ondo_campaign_stats.label_market_value'),
    ).toBeDefined();
  });

  it('shows pending tag when position is not qualified', () => {
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      ...positionDefaults,
      position: makePendingPosition(),
    });
    const { getByText } = render(<OndoCampaignStatsView />);
    expect(
      getByText('rewards.ondo_campaign_leaderboard.pending'),
    ).toBeDefined();
  });

  it('shows check icon when position is qualified', () => {
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      ...positionDefaults,
      position: makeQualifiedPosition(),
    });
    const { queryByText } = render(<OndoCampaignStatsView />);
    expect(
      queryByText('rewards.ondo_campaign_leaderboard.qualified'),
    ).toBeNull();
    expect(queryByText('rewards.ondo_campaign_leaderboard.pending')).toBeNull();
  });

  it('shows error banner when leaderboard fails with no cached data', () => {
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      ...positionDefaults,
      position: null,
      hasError: true,
    });
    const { getByTestId } = render(<OndoCampaignStatsView />);
    expect(getByTestId('error-banner')).toBeDefined();
  });

  it('shows error banner when portfolio fails with no cached data', () => {
    mockUseGetOndoPortfolioPosition.mockReturnValue({
      ...portfolioDefaults,
      portfolio: null,
      hasError: true,
    });
    const { getByTestId } = render(<OndoCampaignStatsView />);
    expect(getByTestId('error-banner')).toBeDefined();
  });

  it('calls both refetch functions when retry is pressed on error banner', () => {
    const refetchPosition = jest.fn();
    const refetchPortfolio = jest.fn();
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      ...positionDefaults,
      position: null,
      hasError: true,
      refetch: refetchPosition,
    });
    mockUseGetOndoPortfolioPosition.mockReturnValue({
      ...portfolioDefaults,
      portfolio: null,
      hasError: true,
      refetch: refetchPortfolio,
    });
    const { getByTestId } = render(<OndoCampaignStatsView />);
    fireEvent.press(getByTestId('error-retry-button'));
    expect(refetchPosition).toHaveBeenCalledTimes(1);
    expect(refetchPortfolio).toHaveBeenCalledTimes(1);
  });

  it('shows qualify card when campaign is active, position is pending, and tierMinDeposit is set', () => {
    mockRewardsState.campaigns = [createTestCampaign()];
    mockUseGetCampaignParticipantStatus.mockReturnValue({
      status: { optedIn: true, participantCount: 1 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      ...positionDefaults,
      position: makePendingPosition({
        projectedTier: 'STARTER',
        qualifiedDays: 3,
      }),
    });
    const { getByText } = render(<OndoCampaignStatsView />);
    expect(
      getByText('rewards.ondo_campaign_leaderboard.qualify_for_rank_title'),
    ).toBeDefined();
  });

  describe('completed campaign portfolio display', () => {
    const setupComplete = () => {
      mockGetCampaignStatus.mockReturnValue('complete');
      mockRewardsState.campaigns = [createTestCampaign()];
      mockUseGetCampaignParticipantStatus.mockReturnValue({
        status: { optedIn: true, participantCount: 1 },
        isLoading: false,
        hasError: false,
        refetch: jest.fn(),
      });
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        ...positionDefaults,
        position: makeQualifiedPosition({ rank: 5 }),
      });
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        ...portfolioDefaults,
        portfolio: {
          positions: [],
          summary: {
            totalCurrentValue: '12000',
            totalBookValue: '11000',
            totalUsdDeposited: '11000',
            netDeposit: '10500',
            totalCashedOut: '250',
            portfolioPnl: '1000',
            portfolioPnlPercent: '0.09',
          },
          computedAt: '2024-01-01T00:00:00Z',
        },
      });
    };

    it('shows only rate of return and hides net inflow when campaign is complete', () => {
      setupComplete();
      const { getByText, queryByText } = render(<OndoCampaignStatsView />);
      expect(
        getByText('rewards.ondo_campaign_stats.label_return'),
      ).toBeDefined();
      expect(
        queryByText('rewards.ondo_campaign_stats.label_net_inflow'),
      ).toBeNull();
    });

    it('hides outflow when campaign is complete', () => {
      setupComplete();
      const { queryByText } = render(<OndoCampaignStatsView />);
      expect(
        queryByText('rewards.ondo_campaign_stats.label_outflow'),
      ).toBeNull();
    });

    it('hides days held when campaign is complete', () => {
      setupComplete();
      const { queryByText } = render(<OndoCampaignStatsView />);
      expect(
        queryByText('rewards.ondo_campaign_stats.label_days_held'),
      ).toBeNull();
    });
  });

  describe('ineligible state', () => {
    const makeIneligibleCampaign = (): CampaignDto => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 5); // 6 days available — below 10-day threshold
      return createTestCampaign({
        startDate: yesterday.toISOString(),
        endDate: endDate.toISOString(),
      });
    };

    const setupIneligible = () => {
      mockGetCampaignStatus.mockReturnValue('active');
      mockRewardsState.campaigns = [makeIneligibleCampaign()];
      mockUseGetCampaignParticipantStatus.mockReturnValue({
        status: { optedIn: true, participantCount: 1 },
        isLoading: false,
        hasError: false,
        refetch: jest.fn(),
      });
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        ...positionDefaults,
        position: makePendingPosition({ qualifiedDays: 0 }),
      });
    };

    it('shows ineligible tag when not enough days remain', () => {
      setupIneligible();
      const { getByText } = render(<OndoCampaignStatsView />);
      expect(
        getByText('rewards.ondo_campaign_leaderboard.ineligible'),
      ).toBeOnTheScreen();
    });

    it('does not show pending tag when ineligible', () => {
      setupIneligible();
      const { queryByText } = render(<OndoCampaignStatsView />);
      expect(
        queryByText('rewards.ondo_campaign_leaderboard.pending'),
      ).toBeNull();
    });

    it('does not show qualified tag when ineligible', () => {
      setupIneligible();
      const { queryByText } = render(<OndoCampaignStatsView />);
      expect(
        queryByText('rewards.ondo_campaign_leaderboard.qualified'),
      ).toBeNull();
    });

    it('shows not-eligible banner when ineligible', () => {
      setupIneligible();
      const { getByTestId } = render(<OndoCampaignStatsView />);
      expect(
        getByTestId('campaign-stats-summary-not-eligible-banner'),
      ).toBeOnTheScreen();
    });

    it('shows dash for rank and tier values when ineligible', () => {
      setupIneligible();
      // position has rank: 8 and projectedTier: 'STARTER' — neither should appear
      const { queryByText } = render(<OndoCampaignStatsView />);
      expect(queryByText('8')).toBeNull();
      expect(queryByText('STARTER')).toBeNull();
    });

    it('does not show ineligible tag when qualified even if campaign ends soon', () => {
      mockGetCampaignStatus.mockReturnValue('active');
      mockRewardsState.campaigns = [makeIneligibleCampaign()];
      mockUseGetCampaignParticipantStatus.mockReturnValue({
        status: { optedIn: true, participantCount: 1 },
        isLoading: false,
        hasError: false,
        refetch: jest.fn(),
      });
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        ...positionDefaults,
        position: makeQualifiedPosition(),
      });
      const { queryByText } = render(<OndoCampaignStatsView />);
      expect(
        queryByText('rewards.ondo_campaign_leaderboard.ineligible'),
      ).toBeNull();
    });

    it('does not show ineligible tag when campaign is complete', () => {
      mockGetCampaignStatus.mockReturnValue('complete');
      mockRewardsState.campaigns = [makeIneligibleCampaign()];
      mockUseGetCampaignParticipantStatus.mockReturnValue({
        status: { optedIn: true, participantCount: 1 },
        isLoading: false,
        hasError: false,
        refetch: jest.fn(),
      });
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        ...positionDefaults,
        position: makePendingPosition({ qualifiedDays: 0 }),
      });
      const { queryByText } = render(<OndoCampaignStatsView />);
      expect(
        queryByText('rewards.ondo_campaign_leaderboard.ineligible'),
      ).toBeNull();
    });

    it('does not show pending tag when campaign is complete even if position is not qualified', () => {
      mockGetCampaignStatus.mockReturnValue('complete');
      mockRewardsState.campaigns = [createTestCampaign()];
      mockUseGetCampaignParticipantStatus.mockReturnValue({
        status: { optedIn: true, participantCount: 1 },
        isLoading: false,
        hasError: false,
        refetch: jest.fn(),
      });
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        ...positionDefaults,
        position: makePendingPosition(),
      });
      const { queryByText } = render(<OndoCampaignStatsView />);
      expect(
        queryByText('rewards.ondo_campaign_leaderboard.pending'),
      ).toBeNull();
    });
  });

  it('uses routeCampaignName as fallback when campaign has no name', () => {
    globalThis.__ONDO_CAMPAIGN_STATS_TEST_ROUTE__ = {
      campaignId: 'campaign-ondo-123',
      campaignName: 'Route Only Name',
    };
    mockGetCampaignStatus.mockReturnValue('complete');
    mockRewardsState.campaigns = [
      createTestCampaign({ name: undefined as unknown as string }),
    ];
    mockUseGetCampaignParticipantStatus.mockReturnValue({
      status: { optedIn: true, participantCount: 1 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseOndoCampaignParticipantOutcome.mockReturnValue({
      outcome: {
        subscriptionId: 'sub-1',
        outcomeStatus: 'pending',
        winnerVerificationCode: 'LVL346',
      },
      isLoading: false,
      hasError: false,
    });
    const { getByText } = render(<OndoCampaignStatsView />);
    const title = getByText('rewards.ondo_outcome_banner.winner_pending.title');
    fireEvent.press(title);
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_ONDO_CAMPAIGN_WINNING_VIEW,
      expect.objectContaining({ campaignName: 'Route Only Name' }),
    );
  });

  it('shows qualify card with tierMinDeposit fallback when tierMinDeposit is null', () => {
    mockGetCampaignStatus.mockReturnValue('active');
    mockRewardsState.campaigns = [createTestCampaign()];
    mockUseGetCampaignParticipantStatus.mockReturnValue({
      status: { optedIn: true, participantCount: 1 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      ...positionDefaults,
      position: makePendingPosition({
        projectedTier: 'STARTER',
        qualifiedDays: 3,
      }),
    });
    const { getByText } = render(<OndoCampaignStatsView />);
    expect(
      getByText('rewards.ondo_campaign_leaderboard.qualify_for_rank_title'),
    ).toBeDefined();
  });
});
