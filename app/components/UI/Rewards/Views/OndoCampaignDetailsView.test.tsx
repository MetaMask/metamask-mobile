import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OndoCampaignDetailsView, {
  CAMPAIGN_DETAILS_TEST_IDS,
} from './OndoCampaignDetailsView';
import { CAMPAIGN_STATS_SUMMARY_TEST_IDS } from '../components/Campaigns/CampaignStatsSummary';
import { ONDO_PRIZE_POOL_TEST_IDS } from '../components/Campaigns/OndoPrizePool';
import { CAMPAIGN_CTA_TEST_IDS } from '../components/Campaigns/CampaignOptInCta';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useGetOndoLeaderboard } from '../hooks/useGetOndoLeaderboard';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import { useGetOndoPortfolioPosition } from '../hooks/useGetOndoPortfolioPosition';
import { useGetOndoCampaignDeposits } from '../hooks/useGetOndoCampaignDeposits';
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

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  // Skeleton is absent from the installed design-system version; stub it so
  // the loading-state render doesn't throw "Element type is invalid".
  const Skeleton = (props: Record<string, unknown>) =>
    ReactActual.createElement(View, { testID: 'skeleton', ...props });
  return { ...actual, Skeleton };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    // Box uses tagged-template-literal syntax (tw`...`), so the return value
    // must be callable. .style() is used by the view layer itself.
    const tw = () => ({});
    tw.style = (..._args: unknown[]) => ({});
    return tw;
  },
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

const mockCampaignStatsSummary = jest.fn();
jest.mock('../components/Campaigns/CampaignStatsSummary', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const { CAMPAIGN_STATS_SUMMARY_TEST_IDS: actualTestIds } = jest.requireActual(
    '../components/Campaigns/CampaignStatsSummary',
  );
  return {
    __esModule: true,
    CAMPAIGN_STATS_SUMMARY_TEST_IDS: actualTestIds,
    default: (props: Record<string, unknown>) => {
      mockCampaignStatsSummary(props);
      return ReactActual.createElement(View, {
        testID: actualTestIds.CONTAINER,
      });
    },
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

jest.mock('../hooks/useCampaignGeoRestriction', () => ({
  __esModule: true,
  default: () => ({ isGeoRestricted: false, isGeoLoading: false }),
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

jest.mock('../hooks/useGetOndoCampaignDeposits');
const mockUseGetOndoCampaignDeposits =
  useGetOndoCampaignDeposits as jest.MockedFunction<
    typeof useGetOndoCampaignDeposits
  >;

const mockOndoPrizePool = jest.fn();
jest.mock('../components/Campaigns/OndoPrizePool', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const { ONDO_PRIZE_POOL_TEST_IDS: actualTestIds } = jest.requireActual(
    '../components/Campaigns/OndoPrizePool',
  );
  return {
    __esModule: true,
    ONDO_PRIZE_POOL_TEST_IDS: actualTestIds,
    default: (props: Record<string, unknown>) => {
      mockOndoPrizePool(props);
      return ReactActual.createElement(View, {
        testID: actualTestIds.CONTAINER,
      });
    },
  };
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => null),
}));

const mockIsTokenTradingOpen = jest.fn(() => true);
jest.mock('../../Bridge/hooks/useRWAToken', () => ({
  useRWAToken: () => ({
    isTokenTradingOpen: mockIsTokenTradingOpen,
    isStockToken: jest.fn(() => false),
  }),
}));

jest.mock('../../Trending/hooks/useRwaTokens/useRwaTokens', () => ({
  useRwaTokens: () => ({ data: [], isLoading: false }),
}));

jest.mock('../../Perps/utils/marketHours', () => ({
  formatCountdown: jest.fn(() => '2h 30m'),
  getMarketHoursStatus: jest.fn(() => ({
    nextTransition: new Date(Date.now() + 1000 * 60 * 60 * 2),
  })),
}));

// Mock the Engine file directly (imported as Engine/Engine, not Engine/index)
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

// Mock the new Balance import that triggers deep import chains
jest.mock('../../AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => ({ uri: 'https://mock.icon' })),
}));

jest.mock('../../Trending/components/TrendingTokenLogo', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, null),
  };
});

jest.mock('../hooks/useOndoAccountPicker', () => ({
  __esModule: true,
  useOndoAccountPicker: () => {
    const { useState } = jest.requireActual('react');
    const [pendingPicker, setPendingPicker] = useState(null);
    return {
      pendingPicker,
      setPendingPicker,
      sheetRef: { current: null },
      handleGroupSelect: jest.fn(),
    };
  },
}));

// OndoCampaignCTA imports useAnalytics and MetaMetricsEvents which pull in
// the full redux store chain.  Mock both at their resolved paths so the deep
// import chain is never loaded in this test file.
jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({})),
    })),
    isEnabled: jest.fn(() => true),
  }),
}));

jest.mock('../../../../core/Analytics', () => ({
  MetaMetricsEvents: {},
  EVENT_NAME: {},
}));

// OndoPortfolio named exports used by the account picker bottom sheet
jest.mock('../components/Campaigns/OndoPortfolio', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onOpenAccountPicker,
      onNotEligible,
    }: {
      marketOpen?: boolean;
      onOpenAccountPicker?: (config: unknown) => void;
      onNotEligible?: (action: () => void) => void;
    }) =>
      ReactActual.createElement(
        View,
        null,
        ReactActual.createElement(Pressable, {
          testID: 'ondo-campaign-portfolio',
          onPress: () =>
            onOpenAccountPicker?.({
              row: {
                tokenAsset: 'eip155:1/erc20:0xabc',
                tokenSymbol: 'USDC',
                tokenName: 'USD Coin',
              },
              entries: [
                {
                  group: { id: 'group-1', metadata: { name: 'Account 1' } },
                  balance: '100',
                },
              ],
              tokenDecimals: 6,
            }),
        }),
        ReactActual.createElement(Pressable, {
          testID: 'ondo-campaign-portfolio-not-eligible',
          onPress: () => onNotEligible?.(jest.fn()),
        }),
      ),
    AccountGroupSelectRow: () => ReactActual.createElement(View, null),
    getChainHex: jest.fn(() => '0x1'),
  };
});

jest.mock('../components/Campaigns/OndoNotEligibleSheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onClose,
      onConfirm,
    }: {
      onClose: () => void;
      onConfirm: () => void;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'ondo-not-eligible-sheet' },
        ReactActual.createElement(Pressable, {
          testID: 'ondo-not-eligible-sheet-close',
          onPress: onClose,
        }),
        ReactActual.createElement(Pressable, {
          testID: 'ondo-not-eligible-sheet-confirm',
          onPress: onConfirm,
        }),
      ),
  };
});

jest.mock('../components/Campaigns/OndoAccountPickerSheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onClose,
    }: {
      pendingPicker: unknown;
      sheetRef: unknown;
      onClose: () => void;
      onGroupSelect: () => void;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'account-picker-sheet' },
        ReactActual.createElement(Pressable, {
          testID: 'account-picker-sheet-close',
          onPress: onClose,
        }),
      ),
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.campaigns_view.error_title': 'Unable to load',
      'rewards.campaigns_view.error_description': 'Please try again.',
      'rewards.campaigns_view.retry_button': 'Retry',
      'rewards.campaign_details.join_campaign': 'Join Campaign',
      'rewards.campaign_details.open_position': 'Open Position',
      'rewards.campaign_details.swap_ondo_assets': 'Swap Ondo Assets',
      'rewards.campaign_details.ondo.entries_closed_title': 'Entries closed',
      'rewards.campaign_details.ondo.entries_closed_description':
        'You missed the opt-in window. Check back for more campaigns in the future.',
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
    mockIsTokenTradingOpen.mockReturnValue(true);
    mockCampaignStatsSummary.mockReset();
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
    mockUseGetOndoCampaignDeposits.mockReturnValue({
      deposits: null,
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockOndoPrizePool.mockReset();
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

    it('renders CampaignHowItWorks when campaign is active and user is not opted in', () => {
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
            },
          }),
        ],
      });
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      expect(getByTestId('campaign-how-it-works')).toBeDefined();
    });

    it('renders CampaignHowItWorks when user is opted in but has no positions', () => {
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
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      expect(getByTestId('campaign-how-it-works')).toBeDefined();
    });

    it('does not render CampaignHowItWorks when user is opted in with positions', () => {
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
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: { positions: [{}], summary: {}, computedAt: '' } as never,
        isLoading: false,
        hasError: false,
        hasFetched: true,
        refetch: jest.fn(),
      });
      const { queryByTestId } = render(<OndoCampaignDetailsView />);
      expect(queryByTestId('campaign-how-it-works')).toBeNull();
    });

    it('does not render CampaignHowItWorks when campaign has no details', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign({ details: null })],
      });
      const { queryByTestId } = render(<OndoCampaignDetailsView />);
      expect(queryByTestId('campaign-how-it-works')).toBeNull();
    });

    it('renders CampaignStatsSummary when user has portfolio positions', () => {
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
      expect(
        getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.CONTAINER),
      ).toBeDefined();
    });

    it('does not render CampaignStatsSummary when participant has no positions', () => {
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
      expect(
        queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.CONTAINER),
      ).toBeNull();
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

    it('renders the entries-closed CTA when campaign is complete and user is not opted in', () => {
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
      expect(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeDefined();
    });
  });

  describe('stats summary and leaderboard', () => {
    it('shows CampaignStatsSummary when participant is opted in with positions', () => {
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
      expect(
        getByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.CONTAINER),
      ).toBeDefined();
    });

    it('does not show CampaignStatsSummary when not opted in and campaign is active', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      const { queryByTestId } = render(<OndoCampaignDetailsView />);
      expect(
        queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.CONTAINER),
      ).toBeNull();
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
      expect(
        queryByTestId(CAMPAIGN_STATS_SUMMARY_TEST_IDS.CONTAINER),
      ).toBeNull();
    });

    it('shows OndoLeaderboard when not opted in and campaign is active', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      expect(getByTestId('ondo-leaderboard')).toBeDefined();
    });

    it('always shows leaderboard title and navigation arrow when campaign exists', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      const { getByText } = render(<OndoCampaignDetailsView />);
      expect(
        getByText('rewards.ondo_campaign_leaderboard.title'),
      ).toBeDefined();
    });

    it('shows leaderboard title when campaign is complete and not opted in', () => {
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

  describe('account picker sheet', () => {
    it('closes the account picker sheet when onClose is triggered', () => {
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
      const { getByTestId, queryByTestId } = render(
        <OndoCampaignDetailsView />,
      );
      // Open the account picker by pressing the portfolio mock
      fireEvent.press(getByTestId('ondo-campaign-portfolio'));
      expect(getByTestId('account-picker-sheet')).toBeDefined();
      // Close it
      fireEvent.press(getByTestId('account-picker-sheet-close'));
      expect(queryByTestId('account-picker-sheet')).toBeNull();
    });
  });

  describe('prize pool', () => {
    it('renders OndoPrizePool when campaign is active', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      const { getByTestId } = render(<OndoCampaignDetailsView />);
      expect(getByTestId(ONDO_PRIZE_POOL_TEST_IDS.CONTAINER)).toBeDefined();
    });

    it('does not render OndoPrizePool when no campaign', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [],
      });
      const { queryByTestId } = render(<OndoCampaignDetailsView />);
      expect(queryByTestId(ONDO_PRIZE_POOL_TEST_IDS.CONTAINER)).toBeNull();
    });

    it('does not render OndoPrizePool when campaign is complete', () => {
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
      expect(queryByTestId(ONDO_PRIZE_POOL_TEST_IDS.CONTAINER)).toBeNull();
    });
  });

  describe('stats title navigation', () => {
    it('navigates to the stats view when the stats title is pressed', () => {
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
      fireEvent.press(getByText('rewards.ondo_campaign_stats.title'));
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.REWARDS_ONDO_CAMPAIGN_STATS,
        { campaignId: 'campaign-1' },
      );
    });
  });

  describe('ineligible state — isIneligible prop passed to CampaignStatsSummary', () => {
    const setupWithPositions = () => {
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
    };

    it('passes isIneligible=true when campaign ends in fewer than 10 days', () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 5); // only 6 days available

      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            startDate: yesterday.toISOString(),
            endDate: endDate.toISOString(),
          }),
        ],
      });
      setupWithPositions();
      render(<OndoCampaignDetailsView />);
      expect(mockCampaignStatsSummary).toHaveBeenCalledWith(
        expect.objectContaining({ isIneligible: true }),
      );
    });

    it('passes isIneligible=false when campaign has 10 or more days remaining', () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 20); // 21 days available

      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            startDate: yesterday.toISOString(),
            endDate: endDate.toISOString(),
          }),
        ],
      });
      setupWithPositions();
      render(<OndoCampaignDetailsView />);
      expect(mockCampaignStatsSummary).toHaveBeenCalledWith(
        expect.objectContaining({ isIneligible: false }),
      );
    });

    it('passes isIneligible=false when user is already qualified', () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 5); // only 6 days — would be ineligible

      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [
          createTestCampaign({
            startDate: yesterday.toISOString(),
            endDate: endDate.toISOString(),
          }),
        ],
      });
      setupWithPositions();
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: {
          rank: 1,
          projectedTier: 'MID',
          qualified: true,
          qualifiedDays: 10,
          totalInTier: 50,
          rateOfReturn: 0.1,
          currentUsdValue: 5000,
          totalUsdDeposited: 5000,
          netDeposit: 5000,
          neighbors: [],
          computedAt: '2024-01-01T00:00:00Z',
        },
        isLoading: false,
        hasError: false,
        hasFetched: true,
        refetch: jest.fn(),
      });
      render(<OndoCampaignDetailsView />);
      expect(mockCampaignStatsSummary).toHaveBeenCalledWith(
        expect.objectContaining({ isIneligible: false }),
      );
    });
  });

  describe('not-eligible sheet', () => {
    it('shows OndoNotEligibleSheet when portfolio triggers onNotEligible', () => {
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
      fireEvent.press(getByTestId('ondo-campaign-portfolio-not-eligible'));
      expect(getByTestId('ondo-not-eligible-sheet')).toBeDefined();
    });

    it('dismisses OndoNotEligibleSheet when close is pressed', () => {
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
      const { getByTestId, queryByTestId } = render(
        <OndoCampaignDetailsView />,
      );
      fireEvent.press(getByTestId('ondo-campaign-portfolio-not-eligible'));
      fireEvent.press(getByTestId('ondo-not-eligible-sheet-close'));
      expect(queryByTestId('ondo-not-eligible-sheet')).toBeNull();
    });
  });
});
