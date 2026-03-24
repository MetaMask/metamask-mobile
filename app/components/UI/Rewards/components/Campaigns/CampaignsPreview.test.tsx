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

jest.mock('../../../../../selectors/featureFlagController/rewards', () => ({
  selectCampaignsRewardsEnabledFlag: jest.fn(() => true),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
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

jest.mock('../PreviousSeason/PreviousSeasonTile', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(
        Text,
        { testID: 'previous-season-tile' },
        'Previous Season Tile',
      ),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.campaigns_preview.title': 'Campaigns',
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

  it('renders PreviousSeasonTile when there are no campaigns in any category', () => {
    const { getByTestId } = render(<CampaignsPreview />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIEW),
    ).toBeOnTheScreen();
    expect(getByTestId('previous-season-tile')).toBeOnTheScreen();
  });

  it('renders PreviousSeasonTile when there is an error and no campaigns', () => {
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      hasError: true,
    });

    const { getByTestId } = render(<CampaignsPreview />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIEW),
    ).toBeOnTheScreen();
    expect(getByTestId('previous-season-tile')).toBeOnTheScreen();
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

  it('renders the upcoming campaign as a CampaignTile when no active campaign exists', () => {
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

    const { getByTestId } = render(<CampaignsPreview />);

    expect(getByTestId('campaign-tile-up-1')).toBeOnTheScreen();
  });

  it('renders the most recent previous campaign when no active or upcoming exist', () => {
    const previousCampaign = createTestCampaign({
      id: 'prev-1',
      name: 'Previous Campaign',
    });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      categorizedCampaigns: {
        ...emptyCategorized,
        previous: [previousCampaign],
      },
    });

    const { getByTestId } = render(<CampaignsPreview />);

    expect(getByTestId('campaign-tile-prev-1')).toBeOnTheScreen();
  });

  it('shows the active campaign over upcoming when both exist', () => {
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

    const { getByTestId, queryByTestId } = render(<CampaignsPreview />);

    expect(getByTestId('campaign-tile-active-1')).toBeOnTheScreen();
    expect(queryByTestId('campaign-tile-up-1')).toBeNull();
  });

  it('shows the upcoming campaign over previous when no active exists', () => {
    const upcomingCampaign = createTestCampaign({
      id: 'up-1',
      name: 'Upcoming Campaign',
    });
    const previousCampaign = createTestCampaign({
      id: 'prev-1',
      name: 'Previous Campaign',
    });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      categorizedCampaigns: {
        ...emptyCategorized,
        upcoming: [upcomingCampaign],
        previous: [previousCampaign],
      },
    });

    const { getByTestId, queryByTestId } = render(<CampaignsPreview />);

    expect(getByTestId('campaign-tile-up-1')).toBeOnTheScreen();
    expect(queryByTestId('campaign-tile-prev-1')).toBeNull();
  });

  it('only shows the first active campaign even when multiple exist', () => {
    const first = createTestCampaign({ id: 'a1', name: 'First Active' });
    const second = createTestCampaign({ id: 'a2', name: 'Second Active' });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      categorizedCampaigns: { ...emptyCategorized, active: [first, second] },
    });

    const { getByTestId, queryByTestId } = render(<CampaignsPreview />);

    expect(getByTestId('campaign-tile-a1')).toBeOnTheScreen();
    expect(queryByTestId('campaign-tile-a2')).toBeNull();
  });

  it('only shows the first upcoming campaign even when multiple exist', () => {
    const first = createTestCampaign({ id: 'u1', name: 'First Upcoming' });
    const second = createTestCampaign({ id: 'u2', name: 'Second Upcoming' });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      categorizedCampaigns: { ...emptyCategorized, upcoming: [first, second] },
    });

    const { getByTestId, queryByTestId } = render(<CampaignsPreview />);

    expect(getByTestId('campaign-tile-u1')).toBeOnTheScreen();
    expect(queryByTestId('campaign-tile-u2')).toBeNull();
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

  it('navigates to previous season view when title header is pressed and no campaigns exist', () => {
    mockUseRewardCampaigns.mockReturnValue(mockHookDefaults);

    const { getByText } = render(<CampaignsPreview />);
    fireEvent.press(getByText('Campaigns'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREVIOUS_SEASON_VIEW);
  });
});
