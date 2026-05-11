import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { useVipDashboard } from '../hooks/useVipDashboard';
import type { VipDashboardState } from '../../../../core/Engine/controllers/rewards-controller/types';
import RewardsVipTiersView, {
  REWARDS_VIP_TIERS_VIEW_TEST_IDS,
} from './RewardsVipTiersView';

const mockDispatch = jest.fn();
const mockGoBack = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      dispatch: mockDispatch,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');

  const HeaderStandard = ({
    title,
    onBack,
  }: {
    title: string;
    onBack: () => void;
  }) =>
    ReactActual.createElement(
      View,
      null,
      ReactActual.createElement(Text, null, title),
      ReactActual.createElement(Pressable, { onPress: onBack }),
    );

  const passthrough = (props: {
    children?: React.ReactNode;
    testID?: string;
  }) =>
    ReactActual.createElement(View, { testID: props.testID }, props.children);

  const Skeleton = (props: { testID?: string }) =>
    ReactActual.createElement(View, props);

  return {
    HeaderStandard,
    Box: passthrough,
    BoxFlexDirection: { Row: 'row', Column: 'column' },
    BoxAlignItems: { Center: 'center', Start: 'start', End: 'end' },
    BoxJustifyContent: { Between: 'between', Center: 'center', End: 'end' },
    Text: ({ children, ...rest }: { children?: React.ReactNode }) =>
      ReactActual.createElement(Text, rest, children),
    TextColor: {
      TextAlternative: 'alt',
      TextDefault: 'default',
      SuccessDefault: 'success',
    },
    TextVariant: {
      DisplayMd: 'displayMd',
      HeadingMd: 'headingMd',
      HeadingSm: 'headingSm',
      BodyMd: 'bodyMd',
      BodySm: 'bodySm',
      BodyXs: 'bodyXs',
    },
    FontWeight: { Medium: 'medium', Bold: 'bold' },
    Icon: passthrough,
    IconColor: {
      IconAlternative: 'alt',
      IconDefault: 'default',
      SuccessDefault: 'success',
    },
    IconName: { Check: 'Check', CheckBold: 'CheckBold' },
    IconSize: { Sm: 'sm', Md: 'md' },
    Skeleton,
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../components/RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      onConfirm,
      confirmButtonLabel,
      testID,
    }: {
      title: string;
      description: string;
      onConfirm?: () => void;
      confirmButtonLabel?: string;
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(Text, null, title),
        confirmButtonLabel
          ? ReactActual.createElement(
              Pressable,
              { onPress: onConfirm, testID: `${testID}-retry` },
              ReactActual.createElement(Text, null, confirmButtonLabel),
            )
          : null,
      ),
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (key === 'rewards.vip.tier_thresholds' && params) {
      return `${params.swaps} Swaps • ${params.perps} Perps`;
    }
    if (key === 'rewards.vip.bps_value' && params) {
      return `${params.bps} bps`;
    }
    const t: Record<string, string> = {
      'rewards.vip.tiers_title': 'Tiers',
      'rewards.vip.swaps_label': 'Swaps',
      'rewards.vip.perps_label': 'Perps',
      'rewards.vip.error_title': 'Error',
      'rewards.vip.error_description': 'Error description',
      'rewards.vip.retry_button': 'Retry',
    };
    return t[key] ?? key;
  }),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectIsCurrentSubscriptionVipEnabled: jest.fn(),
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../Views/ErrorBoundary', () => ({
  __esModule: true,
  default: function MockErrorBoundary({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return children;
  },
}));

jest.mock('../hooks/useTrackRewardsPageView', () => jest.fn());

const dashboardWithTiers: VipDashboardState = {
  program: { id: 'p1', name: 'VIP Pilot' },
  period: {
    start: '2026-04-11T00:00:00.000Z',
    end: '2026-05-11T23:59:59.999Z',
  },
  currentTier: { id: 'gold-fox-3', name: 'Gold Fox 3', tier: 3 },
  nextTier: { id: 'gold-fox-4', name: 'Gold Fox 4', tier: 4 },
  progress: {
    percent: 72,
    remainingSwapsUsd: 800_000,
    remainingPerpsUsd: 3_600_000,
    estimatedDaysToNextTier: 4,
    status: 'on_track',
  },
  fees: {
    swapsBps: 15,
    perpsBps: 4,
    nextTierSwapsBps: 12,
    nextTierPerpsBps: 3,
  },
  volume: { swapsUsd: 4_100_000, perpsUsd: 2_300_000 },
  pointsAllocation: { earned: 24_400_000, max: 100_000_000, percent: 24.4 },
  tiers: [
    {
      id: 'default',
      name: 'Default',
      tier: 0,
      swapsRequirementUsd: 0,
      perpsRequirementUsd: 0,
      swapsBps: 87.5,
      perpsBps: 10,
      status: 'completed',
    },
    {
      id: 'gold-fox-3',
      name: 'Gold Fox 3',
      tier: 3,
      swapsRequirementUsd: 7_000_000,
      perpsRequirementUsd: 35_000_000,
      swapsBps: 15,
      perpsBps: 4,
      status: 'current',
    },
  ],
  localizedText: {},
  lastFetched: 0,
};

const mockFetch = jest.fn();
const mockUseVipDashboard = useVipDashboard as jest.MockedFunction<
  typeof useVipDashboard
>;

jest.mock('../hooks/useVipDashboard', () => ({
  useVipDashboard: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseTrackRewardsPageView =
  useTrackRewardsPageView as jest.MockedFunction<
    typeof useTrackRewardsPageView
  >;

const mockSubscribed = () => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) return 'test-subscription-id';
    if (selector === selectIsCurrentSubscriptionVipEnabled) return true;
    return undefined;
  });
};

describe('RewardsVipTiersView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockSubscribed();
    mockUseVipDashboard.mockReturnValue({
      dashboard: dashboardWithTiers,
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipDashboard: mockFetch,
    });
  });

  it('renders one row per tier returned by the backend', () => {
    const { getByTestId, getByText } = render(<RewardsVipTiersView />);

    expect(getByTestId(REWARDS_VIP_TIERS_VIEW_TEST_IDS.ROOT)).toBeOnTheScreen();
    expect(getByTestId(REWARDS_VIP_TIERS_VIEW_TEST_IDS.LIST)).toBeOnTheScreen();
    expect(getByText('Default')).toBeOnTheScreen();
    expect(getByText('Gold Fox 3')).toBeOnTheScreen();
    expect(getByText('Tiers')).toBeOnTheScreen();
    expect(mockUseTrackRewardsPageView).toHaveBeenCalledWith({
      page_type: 'vip_tiers',
      enabled: true,
    });
  });

  it('renders skeleton placeholders while loading without dashboard', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: null,
      isLoading: true,
      hasError: false,
      hasAttemptedFetch: false,
      fetchVipDashboard: mockFetch,
    });
    const { getByTestId } = render(<RewardsVipTiersView />);
    expect(
      getByTestId(REWARDS_VIP_TIERS_VIEW_TEST_IDS.SKELETON),
    ).toBeOnTheScreen();
  });

  it('renders skeleton on the pre-fetch idle window so there is no blank flash', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: null,
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: false,
      fetchVipDashboard: mockFetch,
    });
    const { getByTestId } = render(<RewardsVipTiersView />);
    expect(
      getByTestId(REWARDS_VIP_TIERS_VIEW_TEST_IDS.SKELETON),
    ).toBeOnTheScreen();
  });

  it('redirects subscribed non-VIP users back to the rewards dashboard', async () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) return 'sub';
      if (selector === selectIsCurrentSubscriptionVipEnabled) return false;
      return undefined;
    });

    const { queryByTestId } = render(<RewardsVipTiersView />);
    expect(queryByTestId(REWARDS_VIP_TIERS_VIEW_TEST_IDS.ROOT)).toBeNull();
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(Routes.REWARDS_DASHBOARD),
      );
    });
  });
});
