import React from 'react';
import { render } from '@testing-library/react-native';
import OndoCampaignPortfolioView, {
  CAMPAIGN_PORTFOLIO_TEST_IDS,
} from './OndoCampaignPortfolioView';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { useGetOndoPortfolioPosition } from '../hooks/useGetOndoPortfolioPosition';
import { useGetOndoCampaignActivity } from '../hooks/useGetOndoCampaignActivity';
import {
  CampaignType,
  type CampaignDto,
  type OndoGmActivityEntryDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: jest.fn(),
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

jest.mock('../components/Campaigns/OndoPortfolio', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'ondo-portfolio' }),
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
});
