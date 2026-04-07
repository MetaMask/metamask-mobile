import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OndoCampaignDetailsView, {
  CAMPAIGN_DETAILS_TEST_IDS,
} from './OndoCampaignDetailsView';
import { CAMPAIGN_CTA_TEST_IDS } from '../components/Campaigns/CampaignCTA';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useGetOndoLeaderboard } from '../hooks/useGetOndoLeaderboard';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import { useGetOndoPortfolioPosition } from '../hooks/useGetOndoPortfolioPosition';
import Routes from '../../../../constants/navigation/Routes';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    addListener: jest.fn(() => jest.fn()),
    isFocused: () => true,
  }),
  useRoute: () => ({ params: { campaignId: 'campaign-1' } }),
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
        endButtonIconProps,
      }: {
        title: string;
        onBack: () => void;
        endButtonIconProps?: { testID?: string; onPress?: () => void }[];
      }) =>
        ReactActual.createElement(
          View,
          { testID: 'header' },
          ReactActual.createElement(Text, null, title),
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: 'header-back-button',
          }),
          ...(endButtonIconProps ?? []).map((btn, i) =>
            ReactActual.createElement(Pressable, {
              key: i,
              onPress: btn.onPress,
              testID: btn.testID ?? `end-button-${i}`,
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

jest.mock('../components/Campaigns/CampaignStatus', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ campaign }: { campaign: { name: string } }) =>
      ReactActual.createElement(
        View,
        { testID: 'campaign-status' },
        ReactActual.createElement(Text, null, campaign.name),
      ),
  };
});

jest.mock('../components/Campaigns/CampaignHowItWorks', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'campaign-how-it-works' }),
  };
});

jest.mock('../components/Campaigns/OndoLeaderboard', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'ondo-leaderboard' }),
  };
});

const mockOndoLeaderboardPosition = jest.fn();
jest.mock('../components/Campaigns/OndoLeaderboardPosition', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockOndoLeaderboardPosition(props);
      return ReactActual.createElement(View, {
        testID: 'ondo-leaderboard-position',
      });
    },
  };
});

jest.mock('../components/Campaigns/OndoPortfolio', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, {
        testID: 'ondo-campaign-portfolio',
      }),
  };
});

jest.mock('../components/RewardsInfoBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, {
        testID: 'competition-ended-banner',
      }),
  };
});

jest.mock('../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: jest.fn(),
    RewardsToastOptions: {
      success: jest.fn(),
      error: jest.fn(),
      entriesClosed: jest.fn(() => ({ variant: 'icon' })),
    },
  }),
}));

jest.mock('../components/Campaigns/CampaignOptInSheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ onClose: _onClose }: { onClose?: () => void }) =>
      ReactActual.createElement(View, {
        testID: 'campaign-opt-in-sheet',
        // expose onClose so tests can trigger it
        accessible: true,
        accessibilityLabel: 'opt-in-sheet',
      }),
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
      description: string;
      onConfirm?: () => void;
      confirmButtonLabel?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'error-banner' },
        ReactActual.createElement(Text, null, title),
        confirmButtonLabel &&
          ReactActual.createElement(
            Pressable,
            { onPress: onConfirm, testID: 'error-retry-button' },
            ReactActual.createElement(Text, null, confirmButtonLabel),
          ),
      ),
  };
});

jest.mock('../hooks/useRewardCampaigns');
const mockUseRewardCampaigns = useRewardCampaigns as jest.MockedFunction<
  typeof useRewardCampaigns
>;

jest.mock('../hooks/useGetCampaignParticipantStatus');
const mockUseGetCampaignParticipantStatus =
  useGetCampaignParticipantStatus as jest.MockedFunction<
    typeof useGetCampaignParticipantStatus
  >;

jest.mock('../hooks/useGetOndoLeaderboard');
const mockUseGetOndoLeaderboard = useGetOndoLeaderboard as jest.MockedFunction<
  typeof useGetOndoLeaderboard
>;

jest.mock('../hooks/useGetOndoLeaderboardPosition');
const mockUseGetOndoLeaderboardPosition =
  useGetOndoLeaderboardPosition as jest.MockedFunction<
    typeof useGetOndoLeaderboardPosition
  >;

jest.mock('../hooks/useGetOndoPortfolioPosition');
const mockUseGetOndoPortfolioPosition =
  useGetOndoPortfolioPosition as jest.MockedFunction<
    typeof useGetOndoPortfolioPosition
  >;

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.campaigns_view.error_title': 'Unable to load',
      'rewards.campaigns_view.error_description': 'Please try again.',
      'rewards.campaigns_view.retry_button': 'Retry',
      'rewards.campaign_details.join_campaign': 'Join Campaign',
      'rewards.campaign_details.open_position': 'Open Position',
      'rewards.campaign_details.swap_ondo_assets': 'Swap Ondo Assets',
      'rewards.campaign_details.entries_closed_title': 'Entries closed',
      'rewards.campaign_details.entries_closed_description':
        'You missed the opt-in window',
      'rewards.campaign_details.competition_closed_title':
        'Competition no longer open',
      'rewards.campaign_details.competition_closed_description':
        'Entries are now closed',
    };
    return translations[key] || key;
  },
}));

const createTestCampaign = (
  overrides: Partial<CampaignDto> = {},
): CampaignDto => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return {
    id: 'campaign-1',
    type: CampaignType.ONDO_HOLDING,
    name: 'Test Campaign',
    startDate: yesterday.toISOString(),
    endDate: nextMonth.toISOString(),
    termsAndConditions: null,
    excludedRegions: [],
    details: null,
    featured: true,
    ...overrides,
  };
};

const mockFetchCampaigns = jest.fn();
const emptyCategorized = { active: [], upcoming: [], previous: [] };
const hookDefaults = {
  campaigns: [],
  categorizedCampaigns: emptyCategorized,
  isLoading: false,
  hasLoaded: false,
  hasError: false,
  fetchCampaigns: mockFetchCampaigns,
};

describe('OndoCampaignDetailsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOndoLeaderboardPosition.mockReset();
    mockUseRewardCampaigns.mockReturnValue(hookDefaults);
    mockUseGetCampaignParticipantStatus.mockReturnValue({
      status: null,
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetOndoLeaderboard.mockReturnValue({
      leaderboard: null,
      isLoading: false,
      hasError: false,
      isLeaderboardNotYetComputed: false,
      tierNames: [],
      selectedTier: null,
      selectedTierData: null,
      computedAt: null,
      setSelectedTier: jest.fn(),
      refetch: jest.fn(),
    });
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      position: null,
      isLoading: false,
      hasError: false,
      hasFetched: false,
      refetch: jest.fn(),
    });
    mockUseGetOndoPortfolioPosition.mockReturnValue({
      portfolio: null,
      isLoading: false,
      hasError: false,
      hasFetched: false,
      refetch: jest.fn(),
    });
  });

  it('renders the container', () => {
    mockUseRewardCampaigns.mockReturnValue({
      ...hookDefaults,
      campaigns: [createTestCampaign()],
    });
    const { getByTestId } = render(<OndoCampaignDetailsView />);
    expect(getByTestId(CAMPAIGN_DETAILS_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('renders campaign name in the header', () => {
    mockUseRewardCampaigns.mockReturnValue({
      ...hookDefaults,
      campaigns: [createTestCampaign({ name: 'My Special Campaign' })],
    });
    const { getAllByText } = render(<OndoCampaignDetailsView />);
    // Name appears in both the header title and the CampaignStatus mock
    expect(getAllByText('My Special Campaign').length).toBeGreaterThan(0);
  });

  describe('loading state', () => {
    it('shows no error banner or campaign status while loading with no campaign', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [],
        isLoading: true,
      });
      const { queryByTestId } = render(<OndoCampaignDetailsView />);
      expect(queryByTestId('error-banner')).toBeNull();
      expect(queryByTestId('campaign-status')).toBeNull();
    });
  });

  describe('error state', () => {
    it('shows error banner when hasError and no campaign', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [],
        hasError: true,
      });
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      expect(getByTestId('error-banner')).toBeDefined();
    });

    it('calls fetchCampaigns when retry is pressed', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [],
        hasError: true,
      });
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      fireEvent.press(getByTestId('error-retry-button'));
      expect(mockFetchCampaigns).toHaveBeenCalledTimes(1);
    });

    it('does not show error banner when campaign is found even with hasError', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
        hasError: true,
      });
      const { queryByTestId } = render(<OndoCampaignDetailsView />);
      expect(queryByTestId('error-banner')).toBeNull();
    });
  });

  describe('campaign content', () => {
    it('renders CampaignStatus when campaign is found', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      expect(getByTestId('campaign-status')).toBeDefined();
    });

    it('does not render CampaignHowItWorks when campaign is active and past the deposit cutoff date', () => {
      // Date.now() is mocked to 123ms in testSetup.js; use epoch (0ms) as a "past" cutoff.
      // HowItWorks is hidden once entries are closed so the user sees the leaderboard instead.
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            details: {
              howItWorks: {
                title: 'How it works',
                description: 'Description',
                steps: [],
              },
              depositCutoffDate: new Date(0).toISOString(),
            },
          }),
        ],
      });
      const { queryByTestId } = render(<OndoCampaignDetailsView />);
      expect(queryByTestId('campaign-how-it-works')).toBeNull();
    });

    it('renders CampaignHowItWorks when campaign is active and entries are still open', () => {
      // Any real-world date is "future" relative to the mocked Date.now() of 123ms,
      // so opt-in is still allowed and HowItWorks should be visible.
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            details: {
              howItWorks: {
                title: 'How it works',
                description: 'Description',
                steps: [],
              },
              depositCutoffDate: nextWeek.toISOString(),
            },
          }),
        ],
      });
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      expect(getByTestId('campaign-how-it-works')).toBeDefined();
    });

    it('renders CampaignHowItWorks when campaign is active and entries are still open', () => {
      // Any real-world date is "future" relative to the mocked Date.now() of 123ms,
      // so opt-in is still allowed and HowItWorks should be visible.
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            details: {
              howItWorks: {
                title: 'How it works',
                description: 'Description',
                steps: [],
              },
              depositCutoffDate: nextWeek.toISOString(),
            },
          }),
        ],
      });
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      expect(getByTestId('campaign-how-it-works')).toBeDefined();
    });

    it('does not render CampaignHowItWorks when campaign has no details', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign({ details: null })],
      });
      const { queryByTestId } = render(<OndoCampaignDetailsView />);
      expect(queryByTestId('campaign-how-it-works')).toBeNull();
    });

    it('renders OndoLeaderboardPosition when participant is opted in with positions', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      mockUseGetCampaignParticipantStatus.mockReturnValue({
        status: { optedIn: true, participantCount: 1 },
        isLoading: false,
        hasError: false,
        refetch: jest.fn(),
      });
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: { positions: [{}], summary: {}, computedAt: '' } as never,
        isLoading: false,
        hasError: false,
        hasFetched: true,
        refetch: jest.fn(),
      });
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      expect(getByTestId('ondo-leaderboard-position')).toBeDefined();
    });

    it('does not render OndoLeaderboardPosition when participant is not opted in', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      mockUseGetCampaignParticipantStatus.mockReturnValue({
        status: { optedIn: false, participantCount: 0 },
        isLoading: false,
        hasError: false,
        refetch: jest.fn(),
      });
      const { queryByTestId } = render(<OndoCampaignDetailsView />);
      expect(queryByTestId('ondo-leaderboard-position')).toBeNull();
    });
  });

  describe('opt-in CTA', () => {
    it('renders the join CTA when participant status is null', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      // status null → participantStatus?.optedIn !== true
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      expect(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeDefined();
    });

    it('renders the join CTA when participant is not opted in', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      mockUseGetCampaignParticipantStatus.mockReturnValue({
        status: { optedIn: false, participantCount: 0 },
        isLoading: false,
        hasError: false,
        refetch: jest.fn(),
      });
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      expect(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeDefined();
    });

    it('renders "Open Position" CTA when participant is opted in with no positions', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      mockUseGetCampaignParticipantStatus.mockReturnValue({
        status: { optedIn: true, participantCount: 1 },
        isLoading: false,
        hasError: false,
        refetch: jest.fn(),
      });
      const { getByTestId, getByText } = render(<OndoCampaignDetailsView />);
      expect(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeDefined();
      expect(getByText('Open Position')).toBeDefined();
    });

    it('renders "Swap Ondo Assets" CTA when participant is opted in with positions', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      mockUseGetCampaignParticipantStatus.mockReturnValue({
        status: { optedIn: true, participantCount: 1 },
        isLoading: false,
        hasError: false,
        refetch: jest.fn(),
      });
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: { positions: [{}], summary: {}, computedAt: '' } as never,
        isLoading: false,
        hasError: false,
        hasFetched: true,
        refetch: jest.fn(),
      });
      const { getByTestId, getByText } = render(<OndoCampaignDetailsView />);
      expect(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeDefined();
      expect(getByText('Swap Ondo Assets')).toBeDefined();
    });

    it('hides the CTA while participant status is loading', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      mockUseGetCampaignParticipantStatus.mockReturnValue({
        status: null,
        isLoading: true,
        hasError: false,
        refetch: jest.fn(),
      });
      const { queryByTestId } = render(<OndoCampaignDetailsView />);
      expect(queryByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
    });

    it('does not render CTA when no campaign is loaded', () => {
      const { queryByTestId } = render(<OndoCampaignDetailsView />);
      expect(queryByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
    });

    it('opens the opt-in sheet when CTA is pressed', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));
      expect(getByTestId('campaign-opt-in-sheet')).toBeDefined();
    });

    it('redirects to campaigns view when campaign is upcoming', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            startDate: tomorrow.toISOString(),
            endDate: nextMonth.toISOString(),
          }),
        ],
      });
      render(<OndoCampaignDetailsView />);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_CAMPAIGNS_VIEW);
    });

    it('renders disabled CTA button when entries are closed (past deposit cutoff)', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            details: {
              howItWorks: { title: 'How', description: 'Desc', steps: [] },
              depositCutoffDate: new Date(0).toISOString(),
            },
          }),
        ],
      });
      const { getByTestId, getByText } = render(<OndoCampaignDetailsView />);
      expect(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeDefined();
      expect(getByText('Entries closed')).toBeDefined();
    });

    it('does not render the CTA when campaign is complete', () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            startDate: lastMonth.toISOString(),
            endDate: yesterday.toISOString(),
          }),
        ],
      });
      const { queryByTestId } = render(<OndoCampaignDetailsView />);
      expect(queryByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
    });
  });

  describe('competition ended banner', () => {
    it('shows the banner when campaign is active, past cutoff, and user is not opted in', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            details: {
              howItWorks: { title: 'How', description: 'Desc', steps: [] },
              depositCutoffDate: new Date(0).toISOString(),
            },
          }),
        ],
      });
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      expect(getByTestId('competition-ended-banner')).toBeDefined();
    });

    it('shows the banner when campaign is complete and user is not opted in', () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            startDate: lastMonth.toISOString(),
            endDate: yesterday.toISOString(),
          }),
        ],
      });
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      expect(getByTestId('competition-ended-banner')).toBeDefined();
    });

    it('does not show the banner when entries are still open', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      const { queryByTestId } = render(<OndoCampaignDetailsView />);
      expect(queryByTestId('competition-ended-banner')).toBeNull();
    });

    it('does not show the banner when the user is opted in with portfolio fetching', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            details: {
              howItWorks: { title: 'How', description: 'Desc', steps: [] },
              depositCutoffDate: new Date(0).toISOString(),
            },
          }),
        ],
      });
      mockUseGetCampaignParticipantStatus.mockReturnValue({
        status: { optedIn: true, participantCount: 1 },
        isLoading: false,
        hasError: false,
        refetch: jest.fn(),
      });
      // Portfolio not yet fetched — banner should be hidden while data loads
      const { queryByTestId } = render(<OndoCampaignDetailsView />);
      expect(queryByTestId('competition-ended-banner')).toBeNull();
    });

    it('does not show the banner while participant status is loading (entries closed)', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            details: {
              howItWorks: { title: 'How', description: 'Desc', steps: [] },
              depositCutoffDate: new Date(0).toISOString(),
            },
          }),
        ],
      });
      mockUseGetCampaignParticipantStatus.mockReturnValue({
        status: null,
        isLoading: true,
        hasError: false,
        refetch: jest.fn(),
      });
      const { queryByTestId } = render(<OndoCampaignDetailsView />);
      expect(queryByTestId('competition-ended-banner')).toBeNull();
    });
  });

  describe('leaderboard position', () => {
    it('shows OndoLeaderboardPosition when participant is opted in with positions', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      mockUseGetCampaignParticipantStatus.mockReturnValue({
        status: { optedIn: true, participantCount: 1 },
        isLoading: false,
        hasError: false,
        refetch: jest.fn(),
      });
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: { positions: [{}], summary: {}, computedAt: '' } as never,
        isLoading: false,
        hasError: false,
        hasFetched: true,
        refetch: jest.fn(),
      });
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      expect(getByTestId('ondo-leaderboard-position')).toBeDefined();
    });

    it('does not show OndoLeaderboardPosition when not opted in and campaign is active', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      const { queryByTestId } = render(<OndoCampaignDetailsView />);
      expect(queryByTestId('ondo-leaderboard-position')).toBeNull();
    });

    it('shows OndoLeaderboard when not opted in and campaign is complete', () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            startDate: lastMonth.toISOString(),
            endDate: yesterday.toISOString(),
          }),
        ],
      });
      const { getByTestId, queryByTestId } = render(
        <OndoCampaignDetailsView />,
      );
      expect(getByTestId('ondo-leaderboard')).toBeDefined();
      expect(queryByTestId('ondo-leaderboard-position')).toBeNull();
    });

    it('does not show OndoLeaderboard when not opted in and campaign is active with entries still open', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      const { queryByTestId } = render(<OndoCampaignDetailsView />);
      expect(queryByTestId('ondo-leaderboard')).toBeNull();
    });

    it('shows OndoLeaderboard when not opted in and campaign is active past cutoff date', () => {
      // Date.now() is mocked to 123ms in testSetup.js; use epoch (0ms) as a "past" cutoff
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            details: {
              howItWorks: {
                title: 'How it works',
                description: 'Description',
                steps: [],
              },
              depositCutoffDate: new Date(0).toISOString(),
            },
          }),
        ],
      });
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      expect(getByTestId('ondo-leaderboard')).toBeDefined();
    });

    it('shows OndoLeaderboard when not opted in and campaign is active past cutoff date', () => {
      // Date.now() is mocked to 123ms in testSetup.js; use epoch (0ms) as a "past" cutoff
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            details: {
              howItWorks: {
                title: 'How it works',
                description: 'Description',
                steps: [],
              },
              depositCutoffDate: new Date(0).toISOString(),
            },
          }),
        ],
      });
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      expect(getByTestId('ondo-leaderboard')).toBeDefined();
    });

    it('does not show leaderboard section header when campaign is complete and not opted in', () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            startDate: lastMonth.toISOString(),
            endDate: yesterday.toISOString(),
          }),
        ],
      });
      const { queryByText } = render(<OndoCampaignDetailsView />);
      expect(queryByText('rewards.ondo_campaign_leaderboard.title')).toBeNull();
    });

    it('shows leaderboard section header when opted in with positions', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      mockUseGetCampaignParticipantStatus.mockReturnValue({
        status: { optedIn: true, participantCount: 1 },
        isLoading: false,
        hasError: false,
        refetch: jest.fn(),
      });
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: { positions: [{}], summary: {}, computedAt: '' } as never,
        isLoading: false,
        hasError: false,
        hasFetched: true,
        refetch: jest.fn(),
      });
      const { getByText } = render(<OndoCampaignDetailsView />);
      expect(
        getByText('rewards.ondo_campaign_leaderboard.title'),
      ).toBeDefined();
    });
  });

  describe('navigation', () => {
    it('navigates back when the back button is pressed', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      fireEvent.press(getByTestId('header-back-button'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('navigates to campaign mechanics when the mechanics button is pressed', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      fireEvent.press(getByTestId('campaign-details-mechanics-button'));
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.REWARDS_CAMPAIGN_MECHANICS,
        {
          campaignId: 'campaign-1',
        },
      );
    });
  });
});
