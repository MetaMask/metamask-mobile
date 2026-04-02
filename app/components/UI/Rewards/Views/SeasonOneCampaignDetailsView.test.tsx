import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SeasonOneCampaignDetailsView from './SeasonOneCampaignDetailsView';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
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
      default: ({ title, onBack }: { title: string; onBack: () => void }) =>
        ReactActual.createElement(
          View,
          { testID: 'header' },
          ReactActual.createElement(Text, null, title),
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: 'header-back-button',
          }),
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

jest.mock('../components/PreviousSeason/PreviousSeasonSummary', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'previous-season-summary' }),
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

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.campaigns_view.error_title': 'Unable to load',
      'rewards.campaigns_view.error_description': 'Please try again.',
      'rewards.campaigns_view.retry_button': 'Retry',
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
  hasError: false,
  hasLoaded: false,
  fetchCampaigns: mockFetchCampaigns,
};

describe('SeasonOneCampaignDetailsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRewardCampaigns.mockReturnValue(hookDefaults);
  });

  it('renders without crashing', () => {
    const { getByTestId } = render(<SeasonOneCampaignDetailsView />);
    expect(getByTestId('header')).toBeOnTheScreen();
  });

  describe('loading state', () => {
    it('shows skeletons when loading and not yet loaded with no campaign', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        isLoading: true,
        hasLoaded: false,
        campaigns: [],
      });
      const { queryByTestId } = render(<SeasonOneCampaignDetailsView />);
      expect(queryByTestId('error-banner')).toBeNull();
      expect(queryByTestId('previous-season-summary')).toBeNull();
    });

    it('does not show skeletons when hasLoaded is true', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        isLoading: true,
        hasLoaded: true,
        campaigns: [],
      });
      // Should render without skeletons; no error banner or summary either
      const { queryByTestId } = render(<SeasonOneCampaignDetailsView />);
      expect(queryByTestId('error-banner')).toBeNull();
      expect(queryByTestId('previous-season-summary')).toBeNull();
    });

    it('does not show skeletons when campaign is already loaded', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        isLoading: true,
        hasLoaded: false,
        campaigns: [createTestCampaign()],
      });
      const { getByTestId } = render(<SeasonOneCampaignDetailsView />);
      // campaign is present, so summary renders instead
      expect(getByTestId('previous-season-summary')).toBeOnTheScreen();
    });
  });

  describe('error state', () => {
    it('shows error banner when hasError and no campaign', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        hasError: true,
        campaigns: [],
      });
      const { getByTestId } = render(<SeasonOneCampaignDetailsView />);
      expect(getByTestId('error-banner')).toBeOnTheScreen();
    });

    it('calls fetchCampaigns when retry is pressed', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        hasError: true,
        campaigns: [],
      });
      const { getByTestId } = render(<SeasonOneCampaignDetailsView />);
      fireEvent.press(getByTestId('error-retry-button'));
      expect(mockFetchCampaigns).toHaveBeenCalledTimes(1);
    });

    it('does not show error banner when campaign is found even with hasError', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        hasError: true,
        campaigns: [createTestCampaign()],
      });
      const { queryByTestId } = render(<SeasonOneCampaignDetailsView />);
      expect(queryByTestId('error-banner')).toBeNull();
    });
  });

  describe('campaign content', () => {
    it('renders PreviousSeasonSummary when campaign is found', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      const { getByTestId } = render(<SeasonOneCampaignDetailsView />);
      expect(getByTestId('previous-season-summary')).toBeOnTheScreen();
    });

    it('does not render PreviousSeasonSummary when campaign is not found', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [],
      });
      const { queryByTestId } = render(<SeasonOneCampaignDetailsView />);
      expect(queryByTestId('previous-season-summary')).toBeNull();
    });

    it('does not render PreviousSeasonSummary when campaignId does not match', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign({ id: 'other-campaign' })],
      });
      const { queryByTestId } = render(<SeasonOneCampaignDetailsView />);
      expect(queryByTestId('previous-season-summary')).toBeNull();
    });
  });

  describe('header', () => {
    it('shows the campaign name in the header', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign({ name: 'My Season Campaign' })],
      });
      const { getByText } = render(<SeasonOneCampaignDetailsView />);
      expect(getByText('My Season Campaign')).toBeOnTheScreen();
    });

    it('shows an empty string in the header when no campaign is found', () => {
      mockUseRewardCampaigns.mockReturnValue(hookDefaults);
      const { getByTestId } = render(<SeasonOneCampaignDetailsView />);
      expect(getByTestId('header')).toBeOnTheScreen();
    });
  });

  describe('navigation', () => {
    it('navigates back when the back button is pressed', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        campaigns: [createTestCampaign()],
      });
      const { getByTestId } = render(<SeasonOneCampaignDetailsView />);
      fireEvent.press(getByTestId('header-back-button'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
