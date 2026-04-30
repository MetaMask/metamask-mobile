import React from 'react';
import { render } from '@testing-library/react-native';
import OndoCampaignPortfolioView, {
  CAMPAIGN_PORTFOLIO_TEST_IDS,
} from './OndoCampaignPortfolioView';
import { useGetOndoCampaignActivity } from '../hooks/useGetOndoCampaignActivity';
import type { OndoGmActivityEntryDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';

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
      timeOnly,
    }: {
      entry: { type: string };
      testID?: string;
      timeOnly?: boolean;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(Text, null, entry.type),
        timeOnly &&
          ReactActual.createElement(
            Text,
            { testID: `${testID}-time-only` },
            'time-only',
          ),
      ),
  };
});

jest.mock('../utils/formatUtils', () => ({
  formatRewardsDateLabel: (date: Date) => {
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  },
}));

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
const mockUseGetOndoCampaignActivity = jest.mocked(useGetOndoCampaignActivity);

jest.mock('../../../hooks/useAnalytics/useAnalytics');

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.ondo_campaign_portfolio.activity_title': 'Activity',
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
    jest.mocked(useAnalytics).mockReturnValue(createMockUseAnalyticsHook());
    mockUseGetOndoCampaignActivity.mockReturnValue(activityDefaults);
  });

  it('renders the container', () => {
    const { getByTestId } = render(<OndoCampaignPortfolioView />);
    expect(getByTestId(CAMPAIGN_PORTFOLIO_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('renders "Activity" as the header title', () => {
    const { getByText } = render(<OndoCampaignPortfolioView />);
    expect(getByText('Activity')).toBeDefined();
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

  it('renders date headers for each distinct date', () => {
    mockUseGetOndoCampaignActivity.mockReturnValue({
      ...activityDefaults,
      activityEntries: [
        MOCK_ENTRY,
        { ...MOCK_ENTRY, timestamp: '2026-03-27T10:00:00.000Z' },
      ],
    });

    const { getAllByText } = render(<OndoCampaignPortfolioView />);
    const dateHeaders = getAllByText(/\w+ \d+, \d{4}/);
    expect(dateHeaders.length).toBe(2);
  });

  it('groups entries on the same date under a single header', () => {
    mockUseGetOndoCampaignActivity.mockReturnValue({
      ...activityDefaults,
      activityEntries: [
        MOCK_ENTRY,
        { ...MOCK_ENTRY, timestamp: '2026-03-28T10:00:00.000Z' },
      ],
    });

    const { getAllByText } = render(<OndoCampaignPortfolioView />);
    const dateHeaders = getAllByText(/\w+ \d+, \d{4}/);
    expect(dateHeaders.length).toBe(1);
  });

  it('passes timeOnly to OndoActivityRow', () => {
    mockUseGetOndoCampaignActivity.mockReturnValue({
      ...activityDefaults,
      activityEntries: [MOCK_ENTRY],
    });

    const { getByTestId } = render(<OndoCampaignPortfolioView />);
    expect(getByTestId('portfolio-activity-row-0-time-only')).toBeDefined();
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
