import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import PerpsTradingCampaignStatsView, {
  PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS,
} from './PerpsTradingCampaignStatsView';
import { useGetPerpsTradingCampaignLeaderboardPosition } from '../hooks/useGetPerpsTradingCampaignLeaderboardPosition';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { usePerpsTradingCampaignParticipantOutcome } from '../hooks/usePerpsTradingCampaignParticipantOutcome';
import {
  CampaignType,
  type PerpsTradingCampaignLeaderboardPositionDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../constants/navigation/Routes';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockPerpsStatsHeader = jest.fn();

const CAMPAIGN_ID = 'perps-stats-campaign-1';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({
    params: { campaignId: CAMPAIGN_ID },
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Skeleton = (props: Record<string, unknown>) =>
    ReactActual.createElement(View, { testID: 'skeleton', ...props });
  return { ...actual, Skeleton };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = (..._args: unknown[]) => ({});
    return tw;
  },
}));

jest.mock(
  '../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, Text, Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        title,
        onBack,
        backButtonProps,
        endButtonIconProps,
      }: {
        title: string;
        onBack: () => void;
        backButtonProps?: { testID?: string };
        endButtonIconProps?: { testID?: string; onPress?: () => void }[];
      }) =>
        ReactActual.createElement(
          View,
          { testID: 'perps-stats-header' },
          ReactActual.createElement(Text, null, title),
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: backButtonProps?.testID ?? 'perps-stats-back',
          }),
          ...(endButtonIconProps ?? []).map((btn, i) =>
            ReactActual.createElement(Pressable, {
              key: i,
              onPress: btn.onPress,
              testID: btn.testID,
            }),
          ),
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

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, props, children),
  };
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(() => jest.fn()),
}));

jest.mock('../components/Campaigns/PerpsTradingCampaignStatsHeader', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockPerpsStatsHeader(props);
      return ReactActual.createElement(View, {
        testID: 'perps-stats-header-mock',
      });
    },
  };
});

jest.mock('../utils/formatUtils', () => ({
  formatSignedUsd: (value: number) => `SIGNED_USD_${String(value)}`,
  formatUsd: (value: number) => `USD_${String(value)}`,
  formatRewardsTimeOnly: () => 'TIME_STUB',
}));

jest.mock('../components/RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, {
        testID: testID ?? 'rewards-error-banner',
      }),
  };
});

jest.mock('../hooks/useGetPerpsTradingCampaignLeaderboardPosition');
jest.mock('../hooks/useGetCampaignParticipantStatus');
jest.mock('../hooks/usePerpsTradingCampaignParticipantOutcome', () => ({
  usePerpsTradingCampaignParticipantOutcome: jest.fn(() => ({
    outcome: null,
    isLoading: false,
    hasError: false,
  })),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseGetPosition =
  useGetPerpsTradingCampaignLeaderboardPosition as jest.MockedFunction<
    typeof useGetPerpsTradingCampaignLeaderboardPosition
  >;
const mockUseGetParticipant =
  useGetCampaignParticipantStatus as jest.MockedFunction<
    typeof useGetCampaignParticipantStatus
  >;
const mockUsePerpsTradingCampaignParticipantOutcome =
  usePerpsTradingCampaignParticipantOutcome as jest.MockedFunction<
    typeof usePerpsTradingCampaignParticipantOutcome
  >;

const basePosition: PerpsTradingCampaignLeaderboardPositionDto = {
  rank: 4,
  pnl: 1500.25,
  notionalVolume: 30_000,
  marginDeployed: 2000,
  qualified: true,
  neighbors: [],
  computedAt: '2025-01-01T00:00:00.000Z',
};

const mockCampaign = {
  id: CAMPAIGN_ID,
  type: CampaignType.PERPS_TRADING,
  name: 'Perps Stats Test',
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2099-12-31T23:59:59Z',
  termsAndConditions: null,
  excludedRegions: [],
  featured: false,
  details: { howItWorks: { title: '', description: '', steps: [] } },
};

const mockState = {
  rewards: {
    campaigns: [mockCampaign],
  },
};

describe('PerpsTradingCampaignStatsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector: (s: unknown) => unknown) =>
      selector(mockState),
    );
    mockUseGetParticipant.mockReturnValue({
      status: { optedIn: true, participantCount: 5 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUsePerpsTradingCampaignParticipantOutcome.mockReturnValue({
      outcome: null,
      isLoading: false,
      hasError: false,
    });
    mockUseGetPosition.mockReturnValue({
      position: basePosition,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });
  });

  it('renders with the correct container testID', () => {
    const { getByTestId } = render(<PerpsTradingCampaignStatsView />);
    expect(
      getByTestId(PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.CONTAINER),
    ).toBeDefined();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = render(<PerpsTradingCampaignStatsView />);
    fireEvent.press(getByTestId('perps-stats-back-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('navigates to campaign mechanics when the header mechanics button is pressed', () => {
    const { getByTestId } = render(<PerpsTradingCampaignStatsView />);
    fireEvent.press(getByTestId('perps-stats-mechanics-button'));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_CAMPAIGN_MECHANICS,
      { campaignId: CAMPAIGN_ID },
    );
  });

  it('passes position to stats header with PnL and computed-at hidden', () => {
    render(<PerpsTradingCampaignStatsView />);
    expect(mockPerpsStatsHeader).toHaveBeenCalledWith(
      expect.objectContaining({
        position: basePosition,
        isLoading: false,
        showPnl: false,
        showComputedAt: false,
      }),
    );
  });

  it('passes undefined to position hook when not opted in', () => {
    mockUseGetParticipant.mockReturnValue({
      status: { optedIn: false, participantCount: 0 },
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
    mockUseGetPosition.mockReturnValue({
      position: null,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });
    render(<PerpsTradingCampaignStatsView />);
    expect(mockUseGetPosition).toHaveBeenCalledWith(undefined);
  });

  it('renders performance section labels and stat testIDs when opted in with position', () => {
    const { getByTestId, getByText } = render(
      <PerpsTradingCampaignStatsView />,
    );
    expect(
      getByText('rewards.perps_trading_campaign.performance_title'),
    ).toBeDefined();
    expect(
      getByTestId(PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_PNL),
    ).toBeDefined();
    expect(
      getByTestId(PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_VOLUME),
    ).toBeDefined();
    expect(
      getByTestId(PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_MARGIN),
    ).toBeDefined();
  });

  it('shows last-computed when position has a timestamp', () => {
    const { getByTestId } = render(<PerpsTradingCampaignStatsView />);
    const el = getByTestId(PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.LAST_COMPUTED);
    expect(el.props.children).toBe(
      'rewards.perps_trading_campaign.last_updated',
    );
  });

  it('hides last-computed when there is no position', () => {
    mockUseGetPosition.mockReturnValue({
      position: null,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });
    const { queryByTestId } = render(<PerpsTradingCampaignStatsView />);
    expect(
      queryByTestId(PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.LAST_COMPUTED),
    ).toBeNull();
  });

  it("shows You're qualified card under performance when active and user is qualified", () => {
    const { getByTestId, queryByTestId } = render(
      <PerpsTradingCampaignStatsView />,
    );
    expect(
      getByTestId(PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.QUALIFIED_CARD),
    ).toBeDefined();
    expect(
      queryByTestId(PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.QUALIFY_FOR_RANK_CARD),
    ).toBeNull();
  });

  it('hides qualification cards when campaign is complete and shows last-computed after performance when position exists', () => {
    const completeCampaign = {
      ...mockCampaign,
      endDate: '2020-01-01T00:00:00Z',
    };
    mockUseSelector.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        rewards: { campaigns: [completeCampaign] },
      }),
    );
    const { getByTestId, queryByTestId } = render(
      <PerpsTradingCampaignStatsView />,
    );
    expect(
      queryByTestId(PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.QUALIFIED_CARD),
    ).toBeNull();
    expect(
      queryByTestId(PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.QUALIFY_FOR_RANK_CARD),
    ).toBeNull();
    const last = getByTestId(PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.LAST_COMPUTED);
    const qualified = queryByTestId(
      PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.QUALIFIED_CARD,
    );
    expect(qualified).toBeNull();
    expect(last).toBeDefined();
  });

  it('shows Qualify for rank card when pending and notional is below threshold', () => {
    mockUseGetPosition.mockReturnValue({
      position: {
        ...basePosition,
        qualified: false,
        notionalVolume: 5_000,
        marginDeployed: 500,
      },
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });
    const { getByTestId, queryByTestId } = render(
      <PerpsTradingCampaignStatsView />,
    );
    expect(
      getByTestId(PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.QUALIFY_FOR_RANK_CARD),
    ).toBeDefined();
    expect(
      queryByTestId(PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.QUALIFIED_CARD),
    ).toBeNull();
  });

  it('shows error banner when hasError is true and no position data', () => {
    mockUseGetPosition.mockReturnValue({
      position: null,
      isLoading: false,
      hasError: true,
      hasFetched: true,
      refetch: jest.fn(),
    });
    const { getByTestId } = render(<PerpsTradingCampaignStatsView />);
    expect(getByTestId('rewards-error-banner')).toBeDefined();
  });

  it('hides error banner when hasError is false', () => {
    const { queryByTestId } = render(<PerpsTradingCampaignStatsView />);
    expect(queryByTestId('rewards-error-banner')).toBeNull();
  });

  it('hides error banner when there is an error but position data is already loaded', () => {
    mockUseGetPosition.mockReturnValue({
      position: basePosition,
      isLoading: false,
      hasError: true,
      hasFetched: true,
      refetch: jest.fn(),
    });
    const { queryByTestId } = render(<PerpsTradingCampaignStatsView />);
    expect(queryByTestId('rewards-error-banner')).toBeNull();
  });
});
