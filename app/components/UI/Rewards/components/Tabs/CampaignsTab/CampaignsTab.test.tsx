import React from 'react';
import { render } from '@testing-library/react-native';
import { CampaignsTab } from './CampaignsTab';
import { useRewardCampaigns } from '../../../hooks/useRewardCampaigns';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import type {
  CampaignDto,
  CampaignType,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';

const createTestCampaign = (
  overrides: Partial<CampaignDto> = {},
): CampaignDto => ({
  id: 'campaign-1',
  type: 'ONDO_HOLDING' as CampaignType,
  name: 'Test Campaign',
  startDate: '2025-01-01T00:00:00.000Z',
  endDate: '2027-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  statusLabel: 'Active',
  ...overrides,
});

const mockUseRewardCampaigns = useRewardCampaigns as jest.MockedFunction<
  typeof useRewardCampaigns
>;

jest.mock('../../../hooks/useRewardCampaigns', () => ({
  useRewardCampaigns: jest.fn(),
}));

jest.mock('./CampaignsGroup', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return ({ title, campaigns }: { title: string; campaigns: unknown[] }) =>
    campaigns.length > 0
      ? ReactActual.createElement(
          View,
          { testID: `campaigns-group-${title}` },
          ReactActual.createElement(Text, null, title),
        )
      : null;
});

jest.mock('../../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return function MockRewardsErrorBanner() {
    return ReactActual.createElement(
      Text,
      { testID: 'rewards-error-banner' },
      'RewardsErrorBanner',
    );
  };
});

jest.mock('../../../../../../component-library/components/Skeleton', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    Skeleton: (props: object) =>
      ReactActual.createElement(View, { testID: 'skeleton', ...props }),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: string[]) => args }),
}));

jest.mock('react-native-gesture-handler', () => ({
  ScrollView: jest.requireActual('react-native').ScrollView,
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('CampaignsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders campaign groups when campaigns exist', () => {
    const activeCampaign = createTestCampaign({
      id: 'active-1',
      name: 'Active',
    });
    const upcomingCampaign = createTestCampaign({
      id: 'upcoming-1',
      name: 'Upcoming',
    });
    const previousCampaign = createTestCampaign({
      id: 'previous-1',
      name: 'Previous',
    });

    mockUseRewardCampaigns.mockReturnValue({
      categorizedCampaigns: {
        active: [activeCampaign],
        upcoming: [upcomingCampaign],
        previous: [previousCampaign],
      },
      campaigns: [activeCampaign, upcomingCampaign, previousCampaign],
      isLoading: false,
      hasError: false,
      fetchCampaigns: jest.fn(),
    });

    const { getByTestId, getByText } = render(<CampaignsTab />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTENT_CAMPAIGNS),
    ).toBeOnTheScreen();
    expect(
      getByTestId('campaigns-group-rewards.campaigns_tab.active_title'),
    ).toBeOnTheScreen();
    expect(
      getByTestId('campaigns-group-rewards.campaigns_tab.upcoming_title'),
    ).toBeOnTheScreen();
    expect(
      getByTestId('campaigns-group-rewards.campaigns_tab.previous_title'),
    ).toBeOnTheScreen();
    expect(getByText('rewards.campaigns_tab.active_title')).toBeOnTheScreen();
  });

  it('shows empty state when no campaigns and not loading', () => {
    mockUseRewardCampaigns.mockReturnValue({
      categorizedCampaigns: {
        active: [],
        upcoming: [],
        previous: [],
      },
      campaigns: [],
      isLoading: false,
      hasError: false,
      fetchCampaigns: jest.fn(),
    });

    const { getByText } = render(<CampaignsTab />);

    expect(getByText('rewards.campaigns_tab.empty_state')).toBeOnTheScreen();
  });

  it('shows loading skeleton when loading with no campaigns', () => {
    mockUseRewardCampaigns.mockReturnValue({
      categorizedCampaigns: {
        active: [],
        upcoming: [],
        previous: [],
      },
      campaigns: [],
      isLoading: true,
      hasError: false,
      fetchCampaigns: jest.fn(),
    });

    const { getAllByTestId } = render(<CampaignsTab />);

    expect(getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('shows error banner when error with no campaigns', () => {
    mockUseRewardCampaigns.mockReturnValue({
      categorizedCampaigns: {
        active: [],
        upcoming: [],
        previous: [],
      },
      campaigns: [],
      isLoading: false,
      hasError: true,
      fetchCampaigns: jest.fn(),
    });

    const { getByTestId } = render(<CampaignsTab />);

    expect(getByTestId('rewards-error-banner')).toBeOnTheScreen();
  });
});
