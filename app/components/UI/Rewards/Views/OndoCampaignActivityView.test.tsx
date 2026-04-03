import React from 'react';
import { render } from '@testing-library/react-native';
import OndoCampaignActivityView, {
  CAMPAIGN_ACTIVITY_TEST_IDS,
} from './OndoCampaignActivityView';
import { useGetOndoCampaignActivity } from '../hooks/useGetOndoCampaignActivity';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
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

jest.mock('../hooks/useGetOndoCampaignActivity');
const mockUseGetOndoCampaignActivity =
  useGetOndoCampaignActivity as jest.MockedFunction<
    typeof useGetOndoCampaignActivity
  >;

jest.mock('../hooks/useRewardCampaigns');
const mockUseRewardCampaigns = useRewardCampaigns as jest.MockedFunction<
  typeof useRewardCampaigns
>;

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
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

const hookDefaults = {
  activityEntries: null as OndoGmActivityEntryDto[] | null,
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  error: null as string | null,
  loadMore: jest.fn(),
  refresh: jest.fn(),
  isRefreshing: false,
};

describe('OndoCampaignActivityView', () => {
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
    mockUseGetOndoCampaignActivity.mockReturnValue(hookDefaults);
  });

  it('renders the container', () => {
    const { getByTestId } = render(<OndoCampaignActivityView />);
    expect(getByTestId(CAMPAIGN_ACTIVITY_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('renders campaign name in header title', () => {
    const { getByText } = render(<OndoCampaignActivityView />);
    expect(getByText('Test Campaign Activity')).toBeDefined();
  });

  it('renders activity rows when data is available', () => {
    mockUseGetOndoCampaignActivity.mockReturnValue({
      ...hookDefaults,
      activityEntries: [
        MOCK_ENTRY,
        { ...MOCK_ENTRY, timestamp: '2026-03-27T10:00:00.000Z' },
      ],
    });

    const { getByTestId } = render(<OndoCampaignActivityView />);

    expect(getByTestId('campaign-activity-row-0')).toBeDefined();
    expect(getByTestId('campaign-activity-row-1')).toBeDefined();
  });

  it('renders empty banner when no entries and not loading', () => {
    mockUseGetOndoCampaignActivity.mockReturnValue({
      ...hookDefaults,
      activityEntries: [],
    });

    const { getByTestId } = render(<OndoCampaignActivityView />);
    expect(getByTestId('info-banner')).toBeDefined();
  });

  it('renders error banner when error and no entries', () => {
    mockUseGetOndoCampaignActivity.mockReturnValue({
      ...hookDefaults,
      activityEntries: [],
      error: 'Network error',
    });

    const { getByTestId } = render(<OndoCampaignActivityView />);
    expect(getByTestId('error-banner')).toBeDefined();
  });

  it('renders generic title when campaign not found', () => {
    mockUseRewardCampaigns.mockReturnValue({
      campaigns: [],
      categorizedCampaigns: emptyCategorized,
      isLoading: false,
      hasLoaded: true,
      hasError: false,
      fetchCampaigns: jest.fn(),
    });

    const { getByText } = render(<OndoCampaignActivityView />);
    expect(getByText('Activity')).toBeDefined();
  });
});
