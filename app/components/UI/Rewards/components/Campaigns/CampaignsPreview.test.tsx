import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampaignsPreview from './CampaignsPreview';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../../constants/navigation/Routes';
import { useRewardCampaigns } from '../../hooks/useRewardCampaigns';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../hooks/useRewardCampaigns');
const mockUseRewardCampaigns = useRewardCampaigns as jest.MockedFunction<
  typeof useRewardCampaigns
>;

jest.mock('./CampaignTile', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ campaign }: { campaign: CampaignDto }) =>
      ReactActual.createElement(
        Text,
        { testID: `campaign-tile-${campaign.id}` },
        campaign.name,
      ),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.campaigns_preview.title': 'Campaigns',
      'rewards.campaigns_preview.coming_soon': 'Coming soon',
      'rewards.campaigns_preview.notify_me': 'Notify me',
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
  statusLabel: 'Active',
  details: null,
  ...overrides,
});

const emptyCategorized = { active: [], upcoming: [], previous: [] };

const mockHookDefaults = {
  campaigns: [],
  categorizedCampaigns: emptyCategorized,
  isLoading: false,
  hasError: false,
  fetchCampaigns: jest.fn(),
};

describe('CampaignsPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRewardCampaigns.mockReturnValue(mockHookDefaults);
  });

  it('returns null when there are no active or upcoming campaigns', () => {
    const { queryByTestId } = render(<CampaignsPreview />);

    expect(queryByTestId(REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIEW)).toBeNull();
  });

  it('renders the section title when an active campaign exists', () => {
    const activeCampaign = createTestCampaign({
      id: 'active-1',
      name: 'Active Campaign',
    });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      categorizedCampaigns: { ...emptyCategorized, active: [activeCampaign] },
    });

    const { getByText, getByTestId } = render(<CampaignsPreview />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIEW),
    ).toBeOnTheScreen();
    expect(getByText('Campaigns')).toBeOnTheScreen();
  });

  it('renders a CampaignTile for the first active campaign', () => {
    const activeCampaign = createTestCampaign({
      id: 'active-1',
      name: 'Active Campaign',
    });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      categorizedCampaigns: { ...emptyCategorized, active: [activeCampaign] },
    });

    const { getByText } = render(<CampaignsPreview />);

    expect(getByText('Active Campaign')).toBeOnTheScreen();
  });

  it('renders the upcoming banner when an upcoming campaign exists', () => {
    const upcomingCampaign = createTestCampaign({
      id: 'up-1',
      name: 'Upcoming Campaign',
    });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      categorizedCampaigns: {
        ...emptyCategorized,
        upcoming: [upcomingCampaign],
      },
    });

    const { getByText, getByTestId } = render(<CampaignsPreview />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIEW_UPCOMING_BANNER),
    ).toBeOnTheScreen();
    expect(getByText('Coming soon')).toBeOnTheScreen();
    expect(getByText('Upcoming Campaign')).toBeOnTheScreen();
    expect(getByText('Notify me')).toBeOnTheScreen();
  });

  it('renders both active tile and upcoming banner when both exist', () => {
    const activeCampaign = createTestCampaign({
      id: 'active-1',
      name: 'Active Campaign',
    });
    const upcomingCampaign = createTestCampaign({
      id: 'up-1',
      name: 'Upcoming Campaign',
    });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      categorizedCampaigns: {
        ...emptyCategorized,
        active: [activeCampaign],
        upcoming: [upcomingCampaign],
      },
    });

    const { getByText } = render(<CampaignsPreview />);

    expect(getByText('Active Campaign')).toBeOnTheScreen();
    expect(getByText('Upcoming Campaign')).toBeOnTheScreen();
  });

  it('does not render a CampaignTile when there are no active campaigns', () => {
    const upcomingCampaign = createTestCampaign({
      id: 'up-1',
      name: 'Upcoming Campaign',
    });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      categorizedCampaigns: {
        ...emptyCategorized,
        upcoming: [upcomingCampaign],
      },
    });

    const { queryByTestId } = render(<CampaignsPreview />);

    expect(queryByTestId('campaign-tile-up-1')).toBeNull();
  });

  it('does not render the upcoming banner when there are no upcoming campaigns', () => {
    const activeCampaign = createTestCampaign({
      id: 'active-1',
      name: 'Active Campaign',
    });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      categorizedCampaigns: { ...emptyCategorized, active: [activeCampaign] },
    });

    const { queryByTestId } = render(<CampaignsPreview />);

    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIEW_UPCOMING_BANNER),
    ).toBeNull();
  });

  it('navigates to campaigns view when the title header is pressed', () => {
    const activeCampaign = createTestCampaign({
      id: 'active-1',
      name: 'Active Campaign',
    });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      categorizedCampaigns: { ...emptyCategorized, active: [activeCampaign] },
    });

    const { getByText } = render(<CampaignsPreview />);
    fireEvent.press(getByText('Campaigns'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.CAMPAIGNS_VIEW);
  });

  it('only shows the first active campaign even when multiple exist', () => {
    const first = createTestCampaign({ id: 'a1', name: 'First Active' });
    const second = createTestCampaign({ id: 'a2', name: 'Second Active' });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      categorizedCampaigns: { ...emptyCategorized, active: [first, second] },
    });

    const { getByText, queryByText } = render(<CampaignsPreview />);

    expect(getByText('First Active')).toBeOnTheScreen();
    expect(queryByText('Second Active')).toBeNull();
  });

  it('only shows the first upcoming campaign even when multiple exist', () => {
    const first = createTestCampaign({ id: 'u1', name: 'First Upcoming' });
    const second = createTestCampaign({ id: 'u2', name: 'Second Upcoming' });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      categorizedCampaigns: { ...emptyCategorized, upcoming: [first, second] },
    });

    const { getByText, queryByText } = render(<CampaignsPreview />);

    expect(getByText('First Upcoming')).toBeOnTheScreen();
    expect(queryByText('Second Upcoming')).toBeNull();
  });
});
