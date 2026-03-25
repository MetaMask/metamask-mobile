import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampaignsView from './CampaignsView';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../hooks/useRewardCampaigns');
const mockUseRewardCampaigns = useRewardCampaigns as jest.MockedFunction<
  typeof useRewardCampaigns
>;

jest.mock('../components/Campaigns/CampaignsGroup', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      campaigns,
      testID,
    }: {
      title: string;
      campaigns: CampaignDto[];
      testID?: string;
    }) =>
      campaigns.length > 0
        ? ReactActual.createElement(
            View,
            { testID },
            ReactActual.createElement(Text, null, title),
            campaigns.map((c: CampaignDto) =>
              ReactActual.createElement(Text, { key: c.id }, c.name),
            ),
          )
        : null,
  };
});

jest.mock('../components/RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      description,
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
        ReactActual.createElement(Text, null, description),
        confirmButtonLabel &&
          ReactActual.createElement(
            Pressable,
            { onPress: onConfirm, testID: 'error-retry-button' },
            ReactActual.createElement(Text, null, confirmButtonLabel),
          ),
      ),
  };
});

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

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.campaigns_view.title': 'Campaigns',
      'rewards.campaigns_view.active_title': 'Active',
      'rewards.campaigns_view.upcoming_title': 'Upcoming',
      'rewards.campaigns_view.previous_title': 'Previous',
      'rewards.campaigns_view.empty_state': 'No campaigns available',
      'rewards.campaigns_view.error_title': 'Unable to load campaigns',
      'rewards.campaigns_view.error_description':
        "We couldn't load the campaigns. Please try again.",
      'rewards.campaigns_view.retry_button': 'Retry',
      'rewards.campaigns_view.refreshing': 'Refreshing...',
    };
    return translations[key] || key;
  },
}));

const createTestCampaign = (
  overrides: Partial<CampaignDto> = {},
): CampaignDto => ({
  id: 'campaign-1',
  type: CampaignType.ONDO_HOLDING,
  name: 'Test Campaign',
  startDate: '2027-01-01T00:00:00.000Z',
  endDate: '2027-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: true,
  ...overrides,
});

const emptyCategorized = { active: [], upcoming: [], previous: [] };
const mockFetchCampaigns = jest.fn();

const hookDefaults = {
  campaigns: [],
  categorizedCampaigns: emptyCategorized,
  isLoading: false,
  hasError: false,
  hasLoaded: false,
  fetchCampaigns: mockFetchCampaigns,
};

describe('CampaignsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRewardCampaigns.mockReturnValue(hookDefaults);
  });

  it('renders the header with the correct title', () => {
    const { getByText, getByTestId } = render(<CampaignsView />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.CAMPAIGNS_VIEW),
    ).toBeOnTheScreen();
    expect(getByText('Campaigns')).toBeOnTheScreen();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = render(<CampaignsView />);

    fireEvent.press(getByTestId('header-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  describe('loading state', () => {
    it('renders skeletons when loading with no campaigns', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        isLoading: true,
      });

      const { queryByText } = render(<CampaignsView />);

      expect(queryByText('No campaigns available')).toBeNull();
      expect(queryByText('Unable to load campaigns')).toBeNull();
    });

    it('renders the refreshing indicator when loading with existing campaigns', () => {
      const activeCampaign = createTestCampaign({
        id: 'a1',
        name: 'Active One',
      });
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        isLoading: true,
        categorizedCampaigns: { ...emptyCategorized, active: [activeCampaign] },
      });

      const { getByText } = render(<CampaignsView />);

      expect(getByText('Refreshing...')).toBeOnTheScreen();
      expect(getByText('Active One')).toBeOnTheScreen();
    });
  });

  describe('error state', () => {
    it('renders the error banner when there is an error and no campaigns', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        hasError: true,
      });

      const { getByText } = render(<CampaignsView />);

      expect(getByText('Unable to load campaigns')).toBeOnTheScreen();
      expect(
        getByText("We couldn't load the campaigns. Please try again."),
      ).toBeOnTheScreen();
      expect(getByText('Retry')).toBeOnTheScreen();
    });

    it('calls fetchCampaigns when retry button is pressed', () => {
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        hasError: true,
      });

      const { getByTestId } = render(<CampaignsView />);
      fireEvent.press(getByTestId('error-retry-button'));

      expect(mockFetchCampaigns).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty state', () => {
    it('renders the empty state message when there are no campaigns and not loading', () => {
      const { getByText } = render(<CampaignsView />);

      expect(getByText('No campaigns available')).toBeOnTheScreen();
    });
  });

  describe('campaigns display', () => {
    it('renders active campaigns group', () => {
      const activeCampaign = createTestCampaign({
        id: 'a1',
        name: 'Active One',
      });
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        categorizedCampaigns: { ...emptyCategorized, active: [activeCampaign] },
      });

      const { getByText, getByTestId } = render(<CampaignsView />);

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.CAMPAIGNS_ACTIVE_SECTION),
      ).toBeOnTheScreen();
      expect(getByText('Active')).toBeOnTheScreen();
      expect(getByText('Active One')).toBeOnTheScreen();
    });

    it('renders upcoming campaigns group', () => {
      const upcomingCampaign = createTestCampaign({
        id: 'u1',
        name: 'Upcoming One',
      });
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        categorizedCampaigns: {
          ...emptyCategorized,
          upcoming: [upcomingCampaign],
        },
      });

      const { getByText, getByTestId } = render(<CampaignsView />);

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.CAMPAIGNS_UPCOMING_SECTION),
      ).toBeOnTheScreen();
      expect(getByText('Upcoming')).toBeOnTheScreen();
      expect(getByText('Upcoming One')).toBeOnTheScreen();
    });

    it('renders previous campaigns group', () => {
      const previousCampaign = createTestCampaign({
        id: 'p1',
        name: 'Previous One',
      });
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        categorizedCampaigns: {
          ...emptyCategorized,
          previous: [previousCampaign],
        },
      });

      const { getByText, getByTestId } = render(<CampaignsView />);

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIOUS_SECTION),
      ).toBeOnTheScreen();
      expect(getByText('Previous')).toBeOnTheScreen();
      expect(getByText('Previous One')).toBeOnTheScreen();
    });

    it('renders all three groups when all categories have campaigns', () => {
      const active = createTestCampaign({ id: 'a1', name: 'Active One' });
      const upcoming = createTestCampaign({ id: 'u1', name: 'Upcoming One' });
      const previous = createTestCampaign({ id: 'p1', name: 'Previous One' });

      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        categorizedCampaigns: {
          active: [active],
          upcoming: [upcoming],
          previous: [previous],
        },
      });

      const { getByText } = render(<CampaignsView />);

      expect(getByText('Active')).toBeOnTheScreen();
      expect(getByText('Active One')).toBeOnTheScreen();
      expect(getByText('Upcoming')).toBeOnTheScreen();
      expect(getByText('Upcoming One')).toBeOnTheScreen();
      expect(getByText('Previous')).toBeOnTheScreen();
      expect(getByText('Previous One')).toBeOnTheScreen();
    });

    it('does not show empty state or error when campaigns exist', () => {
      const active = createTestCampaign({ id: 'a1', name: 'Active One' });
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        categorizedCampaigns: { ...emptyCategorized, active: [active] },
      });

      const { queryByText, queryByTestId } = render(<CampaignsView />);

      expect(queryByText('No campaigns available')).toBeNull();
      expect(queryByTestId('error-banner')).toBeNull();
    });

    it('does not show refreshing indicator when not loading', () => {
      const active = createTestCampaign({ id: 'a1', name: 'Active One' });
      mockUseRewardCampaigns.mockReturnValue({
        ...hookDefaults,
        categorizedCampaigns: { ...emptyCategorized, active: [active] },
      });

      const { queryByText } = render(<CampaignsView />);

      expect(queryByText('Refreshing...')).toBeNull();
    });
  });
});
