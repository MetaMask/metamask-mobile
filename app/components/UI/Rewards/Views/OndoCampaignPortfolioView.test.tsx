import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OndoCampaignPortfolioView, {
  CAMPAIGN_PORTFOLIO_TEST_IDS,
} from './OndoCampaignPortfolioView';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { useGetOndoPortfolioPosition } from '../hooks/useGetOndoPortfolioPosition';
import { useGetOndoCampaignActivity } from '../hooks/useGetOndoCampaignActivity';
import Routes from '../../../../constants/navigation/Routes';
import {
  CampaignType,
  type CampaignDto,
  type OndoGmActivityEntryDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';

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
  return {
    useSafeAreaInsets: jest.fn(() => ({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })),
    useSafeAreaFrame: jest.fn(() => ({
      x: 0,
      y: 0,
      width: 390,
      height: 844,
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
    const { View, Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ title }: { title: string }) =>
        ReactActual.createElement(
          View,
          { testID: 'header' },
          ReactActual.createElement(Text, null, title),
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

let capturedOnOpenAccountPicker: ((config: unknown) => void) | undefined;

jest.mock('../components/Campaigns/OndoPortfolio', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onOpenAccountPicker,
    }: {
      onOpenAccountPicker?: (config: unknown) => void;
    }) => {
      capturedOnOpenAccountPicker = onOpenAccountPicker;
      return ReactActual.createElement(Pressable, {
        testID: 'ondo-portfolio',
        onPress: () =>
          onOpenAccountPicker?.({
            row: {
              tokenAsset: 'eip155:1/erc20:0xabc',
              tokenSymbol: 'USDC',
              tokenName: 'USD Coin',
            },
            entries: [
              {
                group: { id: 'group-1', name: 'Account 1' },
                balance: '100',
              },
            ],
          }),
      });
    },
    AccountGroupSelectRow: () => ReactActual.createElement(View, null),
    getChainHex: jest.fn(() => '0x1'),
  };
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => null),
}));

jest.mock('../../../../core/Engine/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AccountTreeController: { setSelectedAccountGroup: jest.fn() },
    },
  },
}));

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

jest.mock('../components/Campaigns/OndoActivityRow', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      entry,
      testID,
    }: {
      entry: { type: string };
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(Text, null, entry.type),
      ),
  };
});

jest.mock('../components/RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ title }: { title: string }) =>
      ReactActual.createElement(
        View,
        { testID: 'error-banner' },
        ReactActual.createElement(Text, null, title),
      ),
  };
});

jest.mock('../components/RewardsInfoBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ title }: { title: string }) =>
      ReactActual.createElement(
        View,
        { testID: 'info-banner' },
        ReactActual.createElement(Text, null, title),
      ),
  };
});

jest.mock('../hooks/useGetOndoPortfolioPosition');
const mockUseGetOndoPortfolioPosition = jest.mocked(
  useGetOndoPortfolioPosition,
);

jest.mock('../hooks/useGetOndoCampaignActivity');
const mockUseGetOndoCampaignActivity = jest.mocked(useGetOndoCampaignActivity);

jest.mock('../hooks/useRewardCampaigns');
const mockUseRewardCampaigns = jest.mocked(useRewardCampaigns);

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.ondo_campaign_portfolio.positions_title': 'Positions',
      'rewards.ondo_campaign_activity.title': 'Activity',
      'rewards.ondo_campaign_activity.error_title': 'Failed to load activity',
      'rewards.ondo_campaign_activity.error_description': 'Please try again.',
      'rewards.ondo_campaign_activity.retry_button': 'Retry',
      'rewards.ondo_campaign_activity.empty_title': 'No activity yet',
      'rewards.ondo_campaign_activity.empty_description':
        'Activity will appear here.',
    };
    return translations[key] ?? key;
  },
}));

const MOCK_CAMPAIGN: CampaignDto = {
  id: 'campaign-1',
  type: CampaignType.ONDO_HOLDING,
  name: 'Test Campaign',
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 86400000).toISOString(),
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: true,
};

const MOCK_ENTRY: OndoGmActivityEntryDto = {
  type: 'DEPOSIT',
  srcToken: {
    tokenAsset: 'eip155:59144/erc20:0xabc',
    tokenSymbol: 'USDC',
    tokenName: 'USD Coin',
  },
  destToken: null,
  destAddress: null,
  usdAmount: '5000.000000',
  timestamp: '2026-03-28T14:30:00.000Z',
};

const emptyCategorized = { active: [], upcoming: [], previous: [] };

const portfolioDefaults = {
  portfolio: null,
  isLoading: false,
  hasError: false,
  hasFetched: false,
  refetch: jest.fn(),
};

const activityDefaults = {
  activityEntries: null as OndoGmActivityEntryDto[] | null,
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  error: null as string | null,
  loadMore: jest.fn(),
  refresh: jest.fn(),
  isRefreshing: false,
};

describe('OndoCampaignPortfolioView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRewardCampaigns.mockReturnValue({
      campaigns: [MOCK_CAMPAIGN],
      categorizedCampaigns: emptyCategorized,
      isLoading: false,
      hasLoaded: true,
      hasError: false,
      fetchCampaigns: jest.fn(),
    });
    mockUseGetOndoPortfolioPosition.mockReturnValue(portfolioDefaults);
    mockUseGetOndoCampaignActivity.mockReturnValue(activityDefaults);
  });

  it('renders the container', () => {
    const { getByTestId } = render(<OndoCampaignPortfolioView />);
    expect(getByTestId(CAMPAIGN_PORTFOLIO_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('renders "Positions" as the header title', () => {
    const { getByText } = render(<OndoCampaignPortfolioView />);
    expect(getByText('Positions')).toBeDefined();
  });

  it('renders the portfolio component in the list header', () => {
    const { getByTestId } = render(<OndoCampaignPortfolioView />);
    expect(getByTestId('ondo-portfolio')).toBeDefined();
  });

  it('renders activity rows when entries are available', () => {
    mockUseGetOndoCampaignActivity.mockReturnValue({
      ...activityDefaults,
      activityEntries: [
        MOCK_ENTRY,
        { ...MOCK_ENTRY, timestamp: '2026-03-27T10:00:00.000Z' },
      ],
    });

    const { getByTestId } = render(<OndoCampaignPortfolioView />);

    expect(getByTestId('portfolio-activity-row-0')).toBeDefined();
    expect(getByTestId('portfolio-activity-row-1')).toBeDefined();
  });

  it('renders empty state when no activity entries', () => {
    mockUseGetOndoCampaignActivity.mockReturnValue({
      ...activityDefaults,
      activityEntries: [],
    });

    const { getByTestId } = render(<OndoCampaignPortfolioView />);
    expect(getByTestId('info-banner')).toBeDefined();
  });

  it('renders error banner when activity fetch fails', () => {
    mockUseGetOndoCampaignActivity.mockReturnValue({
      ...activityDefaults,
      activityEntries: [],
      error: 'Network error',
    });

    const { getByTestId } = render(<OndoCampaignPortfolioView />);
    expect(getByTestId('error-banner')).toBeDefined();
  });

  it('opens account picker bottom sheet when OndoPortfolio triggers onOpenAccountPicker', () => {
    const { getByTestId } = render(<OndoCampaignPortfolioView />);

    fireEvent.press(getByTestId('ondo-portfolio'));

    expect(getByTestId('account-picker-sheet')).toBeDefined();
  });

  it('captures onOpenAccountPicker callback from OndoPortfolio', () => {
    render(<OndoCampaignPortfolioView />);
    expect(capturedOnOpenAccountPicker).toBeDefined();
  });

  it('does not navigate before account picker is triggered', () => {
    render(<OndoCampaignPortfolioView />);
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.REWARDS_ONDO_CAMPAIGN_RWA_ASSET_SELECTOR,
      expect.anything(),
    );
  });

  it('closes account picker sheet and clears pendingPicker when onClose is called', () => {
    const { getByTestId, queryByTestId } = render(
      <OndoCampaignPortfolioView />,
    );
    // Open the account picker
    fireEvent.press(getByTestId('ondo-portfolio'));
    expect(getByTestId('account-picker-sheet')).toBeDefined();
    // Close it
    fireEvent.press(getByTestId('account-picker-sheet-close'));
    expect(queryByTestId('account-picker-sheet')).toBeNull();
  });
});
