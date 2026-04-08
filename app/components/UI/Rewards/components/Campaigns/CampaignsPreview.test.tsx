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
  const { isCampaignTypeSupported } = jest.requireActual(
    './CampaignTile.utils',
  );
  return {
    __esModule: true,
    default: ({
      campaign,
      onPress,
    }: {
      campaign: CampaignDto;
      onPress?: () => void;
    }) => {
      const isInteractive =
        onPress != null || isCampaignTypeSupported(campaign.type);
      return ReactActual.createElement(
        Text,
        {
          testID: `campaign-tile-${campaign.id}`,
          accessibilityState: { disabled: !isInteractive },
        },
        campaign.name,
      );
    },
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

const now = new Date();
const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

const createTestCampaign = (
  overrides: Partial<CampaignDto> = {},
): CampaignDto => ({
  id: 'campaign-1',
  type: CampaignType.ONDO_HOLDING,
  name: 'Test Campaign',
  startDate: pastDate.toISOString(),
  endDate: futureDate.toISOString(),
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: true,
  ...overrides,
});

const mockHookDefaults = {
  campaigns: [],
  categorizedCampaigns: { active: [], upcoming: [], previous: [] },
  isLoading: false,
  hasError: false,
  hasLoaded: true,
  fetchCampaigns: jest.fn(),
};

describe('CampaignsPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRewardCampaigns.mockReturnValue(mockHookDefaults);
  });

  it('renders the section with no campaigns when none are featured', () => {
    const { getByTestId, queryByTestId } = render(<CampaignsPreview />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIEW),
    ).toBeOnTheScreen();
    expect(queryByTestId('campaign-tile-campaign-1')).toBeNull();
  });

  it('renders loading skeleton when campaigns have never been loaded', () => {
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      hasLoaded: false,
      isLoading: false,
    });

    const { Skeleton } = jest.requireActual(
      '@metamask/design-system-react-native',
    );
    const { UNSAFE_getByType } = render(<CampaignsPreview />);

    expect(UNSAFE_getByType(Skeleton)).toBeDefined();
  });

  it('renders error banner when there is an error and no featured campaigns', () => {
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      hasError: true,
      hasLoaded: true,
    });

    const { getByText } = render(<CampaignsPreview />);

    expect(getByText('rewards.campaigns_view.error_title')).toBeOnTheScreen();
  });

  it('renders error banner on first-load failure (not skeleton)', () => {
    const { Skeleton } = jest.requireActual(
      '@metamask/design-system-react-native',
    );
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      hasError: true,
      hasLoaded: true,
      isLoading: false,
    });

    const { getByText, UNSAFE_queryByType } = render(<CampaignsPreview />);

    expect(getByText('rewards.campaigns_view.error_title')).toBeOnTheScreen();
    expect(UNSAFE_queryByType(Skeleton)).toBeNull();
  });

  it('renders the section title when a featured active campaign exists', () => {
    const activeCampaign = createTestCampaign({
      id: 'active-1',
      name: 'Active Campaign',
      featured: true,
    });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      campaigns: [activeCampaign],
    });

    const { getByText, getByTestId } = render(<CampaignsPreview />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIEW),
    ).toBeOnTheScreen();
    expect(getByText('Campaigns')).toBeOnTheScreen();
  });

  it('renders a CampaignTile for a featured active campaign', () => {
    const activeCampaign = createTestCampaign({
      id: 'active-1',
      name: 'Active Campaign',
      featured: true,
    });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      campaigns: [activeCampaign],
    });

    const { getByText } = render(<CampaignsPreview />);

    expect(getByText('Active Campaign')).toBeOnTheScreen();
  });

  it('does not render non-featured campaigns', () => {
    const nonFeaturedCampaign = createTestCampaign({
      id: 'non-featured',
      name: 'Non Featured',
      featured: false,
    });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      campaigns: [nonFeaturedCampaign],
    });

    const { queryByTestId } = render(<CampaignsPreview />);

    expect(queryByTestId('campaign-tile-non-featured')).toBeNull();
  });

  it('renders only the first featured campaign when multiple exist', () => {
    const firstCampaign = createTestCampaign({
      id: 'first-1',
      name: 'First Campaign',
      startDate: pastDate.toISOString(),
      endDate: futureDate.toISOString(),
      featured: true,
    });
    const secondCampaign = createTestCampaign({
      id: 'second-1',
      name: 'Second Campaign',
      startDate: pastDate.toISOString(),
      endDate: futureDate.toISOString(),
      featured: true,
    });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      campaigns: [firstCampaign, secondCampaign],
    });

    const { getByTestId, queryByTestId, getAllByTestId } = render(
      <CampaignsPreview />,
    );

    expect(getByTestId('campaign-tile-first-1')).toBeOnTheScreen();
    expect(queryByTestId('campaign-tile-second-1')).toBeNull();

    const tiles = getAllByTestId(/^campaign-tile-/);
    expect(tiles).toHaveLength(1);
  });

  it('renders SEASON_1 campaign type as interactive', () => {
    const season1Campaign = createTestCampaign({
      id: 'season-1',
      name: 'Season 1 Campaign',
      type: CampaignType.SEASON_1,
      featured: true,
    });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      campaigns: [season1Campaign],
    });

    const { getByTestId } = render(<CampaignsPreview />);

    const tile = getByTestId('campaign-tile-season-1');
    expect(tile.props.accessibilityState.disabled).toBe(false);
  });

  it('renders unsupported campaign types as non-interactive', () => {
    const unknownCampaign = createTestCampaign({
      id: 'unknown-1',
      name: 'Unknown Campaign',
      type: 'UNKNOWN_TYPE' as CampaignType,
      featured: true,
    });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      campaigns: [unknownCampaign],
    });

    const { getByTestId } = render(<CampaignsPreview />);

    const tile = getByTestId('campaign-tile-unknown-1');
    expect(tile.props.accessibilityState.disabled).toBe(true);
  });

  it('renders supported campaign types as interactive', () => {
    const ondoCampaign = createTestCampaign({
      id: 'ondo-1',
      name: 'Ondo Campaign',
      type: CampaignType.ONDO_HOLDING,
      featured: true,
    });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      campaigns: [ondoCampaign],
    });

    const { getByTestId } = render(<CampaignsPreview />);

    const tile = getByTestId('campaign-tile-ondo-1');
    expect(tile.props.accessibilityState.disabled).toBe(false);
  });

  it('navigates to campaigns view when the title header is pressed', () => {
    const activeCampaign = createTestCampaign({
      id: 'active-1',
      name: 'Active Campaign',
      featured: true,
    });
    mockUseRewardCampaigns.mockReturnValue({
      ...mockHookDefaults,
      campaigns: [activeCampaign],
    });

    const { getByText } = render(<CampaignsPreview />);
    fireEvent.press(getByText('Campaigns'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_CAMPAIGNS_VIEW);
  });

  it('navigates to campaigns view even when no featured campaigns exist', () => {
    mockUseRewardCampaigns.mockReturnValue(mockHookDefaults);

    const { getByText } = render(<CampaignsPreview />);
    fireEvent.press(getByText('Campaigns'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_CAMPAIGNS_VIEW);
  });
});
