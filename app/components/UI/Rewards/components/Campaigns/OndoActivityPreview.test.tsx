import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OndoActivityPreview, {
  ONDO_ACTIVITY_PREVIEW_TEST_IDS,
} from './OndoActivityPreview';
import { useGetOndoCampaignActivity } from '../../hooks/useGetOndoCampaignActivity';
import type { OndoGmActivityEntryDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../hooks/useGetOndoCampaignActivity');
const mockUseGetOndoCampaignActivity =
  useGetOndoCampaignActivity as jest.MockedFunction<
    typeof useGetOndoCampaignActivity
  >;

jest.mock('./OndoActivityRow', () => {
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

jest.mock('../RewardsErrorBanner', () => {
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

jest.mock('../RewardsInfoBanner', () => {
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

jest.mock('../../../../../../locales/i18n', () => ({
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

describe('OndoActivityPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetOndoCampaignActivity.mockReturnValue(hookDefaults);
  });

  describe('loading state', () => {
    it('renders skeletons when loading', () => {
      mockUseGetOndoCampaignActivity.mockReturnValue({
        ...hookDefaults,
        isLoading: true,
      });

      const { getByTestId, getByText } = render(
        <OndoActivityPreview campaignId="campaign-1" />,
      );

      expect(getByTestId(ONDO_ACTIVITY_PREVIEW_TEST_IDS.LOADING)).toBeDefined();
      expect(getByText('Activity')).toBeDefined();
    });
  });

  describe('error state', () => {
    it('renders error banner when error and no entries', () => {
      mockUseGetOndoCampaignActivity.mockReturnValue({
        ...hookDefaults,
        error: 'Network error',
      });

      const { getByTestId } = render(
        <OndoActivityPreview campaignId="campaign-1" />,
      );

      expect(getByTestId(ONDO_ACTIVITY_PREVIEW_TEST_IDS.ERROR)).toBeDefined();
    });
  });

  describe('empty state', () => {
    it('renders empty banner when no entries', () => {
      mockUseGetOndoCampaignActivity.mockReturnValue({
        ...hookDefaults,
        activityEntries: [],
      });

      const { getByTestId } = render(
        <OndoActivityPreview campaignId="campaign-1" />,
      );

      expect(getByTestId(ONDO_ACTIVITY_PREVIEW_TEST_IDS.EMPTY)).toBeDefined();
    });
  });

  describe('data state', () => {
    it('renders up to 3 activity rows', () => {
      const entries = Array.from({ length: 5 }, (_, i) => ({
        ...MOCK_ENTRY,
        timestamp: `2026-03-${28 - i}T14:30:00.000Z`,
      }));

      mockUseGetOndoCampaignActivity.mockReturnValue({
        ...hookDefaults,
        activityEntries: entries,
      });

      const { getByTestId, queryByTestId } = render(
        <OndoActivityPreview campaignId="campaign-1" />,
      );

      expect(
        getByTestId(ONDO_ACTIVITY_PREVIEW_TEST_IDS.CONTAINER),
      ).toBeDefined();
      expect(getByTestId('ondo-activity-preview-row-0')).toBeDefined();
      expect(getByTestId('ondo-activity-preview-row-1')).toBeDefined();
      expect(getByTestId('ondo-activity-preview-row-2')).toBeDefined();
      expect(queryByTestId('ondo-activity-preview-row-3')).toBeNull();
    });

    it('renders title and arrow icon', () => {
      mockUseGetOndoCampaignActivity.mockReturnValue({
        ...hookDefaults,
        activityEntries: [MOCK_ENTRY],
      });

      const { getByText } = render(
        <OndoActivityPreview campaignId="campaign-1" />,
      );

      expect(getByText('Activity')).toBeDefined();
    });

    it('navigates to full activity view on press', () => {
      mockUseGetOndoCampaignActivity.mockReturnValue({
        ...hookDefaults,
        activityEntries: [MOCK_ENTRY],
      });

      const { getByText } = render(
        <OndoActivityPreview campaignId="campaign-1" />,
      );

      fireEvent.press(getByText('Activity'));
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.REWARDS_ONDO_CAMPAIGN_ACTIVITY_VIEW,
        { campaignId: 'campaign-1' },
      );
    });
  });
});
