import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OndoLeaderboardView, {
  ONDO_LEADERBOARD_VIEW_TEST_IDS,
} from './OndoLeaderboardView';
import { useSelector } from 'react-redux';
import { useGetOndoLeaderboard } from '../hooks/useGetOndoLeaderboard';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import { useGetOndoPortfolioPosition } from '../hooks/useGetOndoPortfolioPosition';
import { useGetOndoCampaignDeposits } from '../hooks/useGetOndoCampaignDeposits';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({ params: { campaignId: 'campaign-ondo-123' } }),
}));

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
      }: {
        title: string;
        onBack: () => void;
        backButtonProps?: { testID?: string };
      }) =>
        ReactActual.createElement(
          View,
          { testID: 'header' },
          ReactActual.createElement(Text, null, title),
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: backButtonProps?.testID ?? 'header-back-button',
          }),
        ),
    };
  },
);

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(() => jest.fn()),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

jest.mock('../../../Views/ErrorBoundary', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(View, null, children),
  };
});

const mockOndoLeaderboard = jest.fn();
jest.mock('../components/Campaigns/OndoLeaderboard', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockOndoLeaderboard(props);
      return ReactActual.createElement(View, {
        testID: 'campaign-leaderboard',
      });
    },
  };
});

jest.mock('../utils/formatUtils', () => ({
  ...jest.requireActual('../utils/formatUtils'),
  formatRewardsTimeOnly: () => '12:00 PM',
}));

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
  getCampaignTierNames: (
    campaign:
      | { details?: { tiers?: { name: string }[] } | null }
      | null
      | undefined,
  ) => campaign?.details?.tiers?.map((t: { name: string }) => t.name) ?? [],
  buildLeaderboardUserPosition: (
    position: {
      projectedTier: string;
      rank: number;
      neighbors: unknown[];
    } | null,
  ) =>
    position
      ? {
          projectedTier: position.projectedTier,
          rank: position.rank,
          neighbors: position.neighbors,
        }
      : null,
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics');

jest.mock('../hooks/useGetOndoLeaderboard');
jest.mock('../hooks/useGetOndoLeaderboardPosition');
jest.mock('../hooks/useGetOndoPortfolioPosition');
jest.mock('../hooks/useGetOndoCampaignDeposits');
jest.mock('../hooks/useGetCampaignParticipantStatus');

const mockUseGetOndoLeaderboard = useGetOndoLeaderboard as jest.MockedFunction<
  typeof useGetOndoLeaderboard
>;
const mockUseGetOndoLeaderboardPosition =
  useGetOndoLeaderboardPosition as jest.MockedFunction<
    typeof useGetOndoLeaderboardPosition
  >;
const mockUseGetOndoPortfolioPosition =
  useGetOndoPortfolioPosition as jest.MockedFunction<
    typeof useGetOndoPortfolioPosition
  >;
const mockUseGetOndoCampaignDeposits =
  useGetOndoCampaignDeposits as jest.MockedFunction<
    typeof useGetOndoCampaignDeposits
  >;
const mockUseGetCampaignParticipantStatus =
  useGetCampaignParticipantStatus as jest.MockedFunction<
    typeof useGetCampaignParticipantStatus
  >;

const hookDefaults = {
  leaderboard: null,
  isLoading: false,
  hasError: false,
  isLeaderboardNotYetComputed: false,
  tierNames: ['STARTER', 'MID'],
  selectedTier: 'STARTER',
  selectedTierData: { entries: [], totalParticipants: 10 },
  computedAt: '2024-03-20T12:00:00.000Z',
  setSelectedTier: jest.fn(),
  refetch: jest.fn(),
};

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('OndoLeaderboardView', () => {
  const positionDefaults = {
    position: null,
    isLoading: false,
    hasError: false,
    hasFetched: false,
    refetch: jest.fn(),
  };

  const mockCampaign = {
    id: 'campaign-ondo-123',
    type: 'ONDO_HOLDING' as const,
    name: 'Test Campaign',
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2099-12-31T23:59:59Z',
    termsAndConditions: null,
    excludedRegions: [],
    statusLabel: '',
    image: null,
    featured: false,
    showUpcomingDate: false,
    details: {
      howItWorks: { title: '', description: '', steps: [] },
      tiers: [
        { name: 'STARTER', minNetDeposit: 500 },
        { name: 'MID', minNetDeposit: 1000 },
      ],
    },
  };

  const mockState = {
    rewards: {
      referralCode: null,
      campaigns: [mockCampaign],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector: (s: unknown) => unknown) =>
      selector(mockState),
    );
    mockUseGetCampaignParticipantStatus.mockReturnValue({
      status: null,
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetOndoLeaderboard.mockReturnValue(hookDefaults);
    mockUseGetOndoLeaderboardPosition.mockReturnValue(positionDefaults);
    mockUseGetOndoPortfolioPosition.mockReturnValue({
      portfolio: null,
      isLoading: false,
      hasError: false,
      hasFetched: false,
      refetch: jest.fn(),
    });
    mockUseGetOndoCampaignDeposits.mockReturnValue({
      deposits: null,
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
  });

  it('renders with the correct container testID', () => {
    const { getByTestId } = render(<OndoLeaderboardView />);
    expect(getByTestId(ONDO_LEADERBOARD_VIEW_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('renders the OndoLeaderboard component', () => {
    const { getByTestId } = render(<OndoLeaderboardView />);
    expect(getByTestId('campaign-leaderboard')).toBeDefined();
  });

  it('passes hideTierHeader=true to OndoLeaderboard', () => {
    render(<OndoLeaderboardView />);
    expect(mockOndoLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ hideTierHeader: true }),
    );
  });

  it('renders the tier selector row when selectedTier is set', () => {
    const { getByTestId } = render(<OndoLeaderboardView />);
    expect(
      getByTestId(ONDO_LEADERBOARD_VIEW_TEST_IDS.TIER_SELECTOR),
    ).toBeDefined();
  });

  it('does not render tier selector when selectedTier is null', () => {
    mockUseGetOndoLeaderboard.mockReturnValue({
      ...hookDefaults,
      selectedTier: null,
    });
    const { queryByTestId } = render(<OndoLeaderboardView />);
    expect(
      queryByTestId(ONDO_LEADERBOARD_VIEW_TEST_IDS.TIER_SELECTOR),
    ).toBeNull();
  });

  it('shows the last updated timestamp when computedAt is present', () => {
    const { getByText } = render(<OndoLeaderboardView />);
    expect(
      getByText('rewards.ondo_campaign_leaderboard.updated_at'),
    ).toBeDefined();
  });

  it('does not show the last updated timestamp when computedAt is null', () => {
    mockUseGetOndoLeaderboard.mockReturnValue({
      ...hookDefaults,
      computedAt: null,
    });
    const { queryByText } = render(<OndoLeaderboardView />);
    expect(
      queryByText('rewards.ondo_campaign_leaderboard.updated_at'),
    ).toBeNull();
  });

  it('opens the tier selector modal when the tier button is pressed with multiple tiers', () => {
    const { getByTestId } = render(<OndoLeaderboardView />);
    fireEvent.press(getByTestId(ONDO_LEADERBOARD_VIEW_TEST_IDS.TIER_SELECTOR));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        selectedValue: 'STARTER',
      }),
    );
  });

  it('does not open the tier selector modal when only one tier exists', () => {
    mockUseGetOndoLeaderboard.mockReturnValue({
      ...hookDefaults,
      selectedTier: 'STARTER',
    });
    mockUseSelector.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        rewards: {
          referralCode: null,
          campaigns: [
            {
              ...mockCampaign,
              details: {
                ...mockCampaign.details,
                tiers: [{ name: 'STARTER', minNetDeposit: 500 }],
              },
            },
          ],
        },
      }),
    );
    const { getByTestId } = render(<OndoLeaderboardView />);
    fireEvent.press(getByTestId(ONDO_LEADERBOARD_VIEW_TEST_IDS.TIER_SELECTOR));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders Your position section with rank and tier when position exists', () => {
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      ...positionDefaults,
      position: {
        rank: 5,
        projectedTier: 'STARTER',
        qualified: true,
        qualifiedDays: 10,
        totalInTier: 100,
        rateOfReturn: 0.1,
        currentUsdValue: 12500,
        totalUsdDeposited: 10000,
        netDeposit: 8500,
        neighbors: [],
        computedAt: '2024-01-01T00:00:00Z',
      },
    });
    const { getByText } = render(<OndoLeaderboardView />);
    expect(
      getByText('rewards.ondo_campaign_stats.label_your_rank'),
    ).toBeDefined();
    expect(getByText('rewards.ondo_campaign_stats.label_tier')).toBeDefined();
  });

  it('calls useGetOndoLeaderboard with the campaign ID from route params', () => {
    render(<OndoLeaderboardView />);
    expect(mockUseGetOndoLeaderboard).toHaveBeenCalledWith(
      'campaign-ondo-123',
      expect.objectContaining({ defaultTier: undefined }),
    );
  });

  it('calls useGetOndoLeaderboardPosition with the campaign ID when opted in', () => {
    mockUseGetCampaignParticipantStatus.mockReturnValue({
      status: { optedIn: true, participantCount: 1 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    render(<OndoLeaderboardView />);
    expect(mockUseGetOndoLeaderboardPosition).toHaveBeenCalledWith(
      'campaign-ondo-123',
    );
  });

  it('calls useGetOndoLeaderboardPosition with undefined when not opted in', () => {
    render(<OndoLeaderboardView />);
    expect(mockUseGetOndoLeaderboardPosition).toHaveBeenCalledWith(undefined);
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = render(<OndoLeaderboardView />);
    fireEvent.press(getByTestId('ondo-leaderboard-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders while leaderboard is loading', () => {
    mockUseGetOndoLeaderboard.mockReturnValue({
      ...hookDefaults,
      isLoading: true,
    });
    const { getByTestId } = render(<OndoLeaderboardView />);
    expect(getByTestId(ONDO_LEADERBOARD_VIEW_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('renders while leaderboard has an error', () => {
    mockUseGetOndoLeaderboard.mockReturnValue({
      ...hookDefaults,
      hasError: true,
    });
    const { getByTestId } = render(<OndoLeaderboardView />);
    expect(getByTestId(ONDO_LEADERBOARD_VIEW_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('renders when leaderboard is not yet computed', () => {
    mockUseGetOndoLeaderboard.mockReturnValue({
      ...hookDefaults,
      isLeaderboardNotYetComputed: true,
    });
    const { getByTestId } = render(<OndoLeaderboardView />);
    expect(getByTestId(ONDO_LEADERBOARD_VIEW_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('shows Pending tag when position is not qualified', () => {
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      ...positionDefaults,
      position: {
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
      },
    });
    const { getAllByText } = render(<OndoLeaderboardView />);
    expect(
      getAllByText('rewards.ondo_campaign_leaderboard.pending'),
    ).toHaveLength(1);
  });

  it('does not show position section when position is null', () => {
    const { queryByText } = render(<OndoLeaderboardView />);
    expect(queryByText('Rank')).toBeNull();
    expect(queryByText('Tier')).toBeNull();
  });

  it('passes currentUserReferralCode to OndoLeaderboard', () => {
    render(<OndoLeaderboardView />);
    expect(mockOndoLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ currentUserReferralCode: null }),
    );
  });

  it('passes defaultTier from position to useGetOndoLeaderboard', () => {
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      ...positionDefaults,
      position: {
        rank: 5,
        projectedTier: 'MID',
        qualified: true,
        qualifiedDays: 10,
        totalInTier: 100,
        rateOfReturn: 0.1,
        currentUsdValue: 12500,
        totalUsdDeposited: 10000,
        netDeposit: 8500,
        neighbors: [],
        computedAt: '2024-01-01T00:00:00Z',
      },
    });
    render(<OndoLeaderboardView />);
    expect(mockUseGetOndoLeaderboard).toHaveBeenCalledWith(
      'campaign-ondo-123',
      expect.objectContaining({ defaultTier: 'MID' }),
    );
  });

  const qualifiedPosition = {
    rank: 5,
    projectedTier: 'STARTER',
    qualified: true,
    qualifiedDays: 10,
    totalInTier: 100,
    rateOfReturn: 0.1,
    currentUsdValue: 12500,
    totalUsdDeposited: 10000,
    netDeposit: 8500,
    neighbors: [],
    computedAt: '2024-01-01T00:00:00Z',
  };

  it('computes returnValue when portfolioData has a summary', () => {
    mockUseGetCampaignParticipantStatus.mockReturnValue({
      status: { optedIn: true, participantCount: 1 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetOndoPortfolioPosition.mockReturnValue({
      portfolio: {
        summary: {
          portfolioPnlPercent: '0.05',
          totalCurrentValue: '12500',
          totalBookValue: '12000',
          totalUsdDeposited: '10000',
          netDeposit: '10000',
          totalCashedOut: '0',
          portfolioPnl: '500',
        },
      },
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });
    const { getByTestId } = render(<OndoLeaderboardView />);
    expect(getByTestId(ONDO_LEADERBOARD_VIEW_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('uses empty entries and zero totalParticipants when selectedTierData is null', () => {
    mockUseGetOndoLeaderboard.mockReturnValue({
      ...hookDefaults,
      selectedTierData: null,
    });
    render(<OndoLeaderboardView />);
    expect(mockOndoLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ entries: [], totalParticipants: 0 }),
    );
  });

  it('computes prizePoolValue when deposits are loaded', () => {
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      ...positionDefaults,
      position: qualifiedPosition,
    });
    mockUseGetOndoCampaignDeposits.mockReturnValue({
      deposits: { totalUsdDeposited: '5000' },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    const { getByTestId } = render(<OndoLeaderboardView />);
    expect(getByTestId(ONDO_LEADERBOARD_VIEW_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('shows loading state for prize pool when deposits are being fetched', () => {
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      ...positionDefaults,
      position: qualifiedPosition,
    });
    mockUseGetOndoCampaignDeposits.mockReturnValue({
      deposits: null,
      isLoading: true,
      hasError: false,
      refetch: jest.fn(),
    });
    const { getByTestId } = render(<OndoLeaderboardView />);
    expect(getByTestId(ONDO_LEADERBOARD_VIEW_TEST_IDS.CONTAINER)).toBeDefined();
  });

  describe('isCampaignComplete behavior', () => {
    const completeCampaign = {
      ...mockCampaign,
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-02T00:00:00Z',
    };

    const pendingPosition = {
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
    };

    it('does not show Pending tag when campaign is complete and position is not qualified', () => {
      mockUseSelector.mockImplementation((selector: (s: unknown) => unknown) =>
        selector({
          rewards: { referralCode: null, campaigns: [completeCampaign] },
        }),
      );
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        ...positionDefaults,
        position: pendingPosition,
      });
      const { queryByText } = render(<OndoLeaderboardView />);
      expect(
        queryByText('rewards.ondo_campaign_leaderboard.pending'),
      ).toBeNull();
    });

    it('passes isCampaignComplete=true to OndoLeaderboard when campaign is complete', () => {
      mockUseSelector.mockImplementation((selector: (s: unknown) => unknown) =>
        selector({
          rewards: { referralCode: null, campaigns: [completeCampaign] },
        }),
      );
      render(<OndoLeaderboardView />);
      expect(mockOndoLeaderboard).toHaveBeenCalledWith(
        expect.objectContaining({ isCampaignComplete: true }),
      );
    });

    it('passes isCampaignComplete=false to OndoLeaderboard when campaign is active', () => {
      render(<OndoLeaderboardView />);
      expect(mockOndoLeaderboard).toHaveBeenCalledWith(
        expect.objectContaining({ isCampaignComplete: false }),
      );
    });
  });
});
