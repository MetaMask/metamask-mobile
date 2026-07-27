import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import { selectVipProgramEnabled } from '../../../../selectors/featureFlagController/vipProgram';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { useVipDashboard } from '../hooks/useVipDashboard';
import type { VipDashboardState } from '../../../../core/Engine/controllers/rewards-controller/types';
import RewardsVipTiersView, {
  REWARDS_VIP_TIERS_VIEW_TEST_IDS,
} from './RewardsVipTiersView';

const mockDispatch = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockExitRewardsFlow = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../utils', () => ({
  exitRewardsFlow: (...args: unknown[]) => mockExitRewardsFlow(...args),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      dispatch: mockDispatch,
      goBack: mockGoBack,
      navigate: mockNavigate,
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
    IconName: {
      ArrowDown: 'ArrowDown',
      ArrowUp: 'ArrowUp',
      Check: 'Check',
      CheckBold: 'CheckBold',
    },
    IconSize: { Sm: 'sm', Md: 'md', Lg: 'lg' },
    Skeleton,
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const ReactActual = jest.requireActual('react');
  return {
    useTailwind: () => ({ style: (...args: unknown[]) => args }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
    Theme: { Light: 'light', Dark: 'dark' },
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
      return `${params.points} points`;
    }
    if (key === 'rewards.vip.bps_value' && params) {
      return `${params.bps} bps`;
    }
    const t: Record<string, string> = {
      'rewards.vip.tiers_title': 'Tiers',
      'rewards.vip.revenue_share_label': 'Revenue share',
      'rewards.vip.swap_fees_label': 'Swap fees',
      'rewards.vip.swaps_label': 'Swaps',
      'rewards.vip.perps_fees_label': 'Perps fees',
      'rewards.vip.perps_label': 'Perps',
      'rewards.vip.referral_points_label': 'Referral points',
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

jest.mock('../../../../selectors/featureFlagController/vipProgram', () => ({
  selectVipProgramEnabled: jest.fn(),
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
  program: { id: 'mock-vip-program', name: 'Acme Rewards Beta' },
  period: {
    start: '2099-06-01T00:00:00.000Z',
    end: '2099-06-30T23:59:59.999Z',
  },
  computedAt: '2099-06-30T14:52:00.000Z',
  currentTier: { id: 'mock-tier-alpha-3', name: 'Mock Tier Alpha 3', tier: 3 },
  nextTier: { id: 'mock-tier-alpha-4', name: 'Mock Tier Alpha 4', tier: 4 },
  progress: {
    percent: 42,
    remainingPointsToNextTier: 123_456,
    status: 'on_track',
  },
  fees: {
    revenueShareBps: 99,
    swapsBps: 11,
    perpsBps: 7,
    nextTierRevenueShareBps: 88,
    nextTierSwapsBps: 9,
    nextTierPerpsBps: 6,
  },
  volume: {
    swapsUsd: 1_234_567,
    perpsUsd: 9_876_543,
    points: 5_555_555,
    pointsFromReferrals: 111_111,
    referrals: 3,
    referralsCap: 7,
  },
  pointsAllocation: {
    earned: 5_555_555,
    threshold: 7_777_777,
    percent: 71.4,
  },
  tiers: [
    {
      id: 'default',
      name: 'Default',
      tier: 0,
      pointsRequirement: 0,
      revenueShareBps: 0,
      swapsBps: 42.5,
      perpsBps: 10,
      referralCarryoverBps: 0,
      status: 'completed',
    },
    {
      id: 'mock-tier-alpha-3',
      name: 'Mock Tier Alpha 3',
      tier: 3,
      pointsRequirement: 321_000,
      revenueShareBps: 99,
      swapsBps: 11,
      perpsBps: 7,
      referralCarryoverBps: 4242,
      status: 'current',
    },
  ],
  localizedText: {
    periodTitle: 'Jun 1 - Jun 30',
    memberIdTitle: 'Member ID',
    transactionsTitle: 'Transactions',
    swapsFeeTitle: 'Swaps fee',
    perpsFeeTitle: 'Perps fee',
    nextTierSwapsFeeDelta: '↓ 9 bps next tier',
    nextTierPerpsFeeDelta: '↓ 6 bps next tier',
    revenueShareTitle: 'Revenue share',
    referralPointsTitle: 'Referral points',
    nextTierRevenueShareDelta: '↑ 1% next tier',
    nextTierReferralPointsDelta: '↑ 42% next tier',
    topTierDescription: 'Top tier reached',
    statsTitle: 'Volume',
    pointsTitle: 'Points',
    swapsVolumeTitle: 'Swaps Volume',
    pointsFromReferralsTitle: 'Points from Referrals',
    perpsVolumeTitle: 'Perps Volume',
    vipReferralsTitle: 'VIP Referrals',
    totalPointsTitle: 'Points',
    equityLockedTitle: 'Earn VIP allocations',
    equityLockedDescription: 'Body copy',
    equityUnlockedTitle: 'VIP allocation unlocked',
    equityUnlockedDescription: 'Unlocked body copy',
  },
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
    if (selector === selectVipProgramEnabled) return true;
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

  it('renders one row per VIP tier returned by the backend', () => {
    const { getByTestId, getByText, queryByText } = render(
      <RewardsVipTiersView />,
    );

    expect(getByTestId(REWARDS_VIP_TIERS_VIEW_TEST_IDS.ROOT)).toBeOnTheScreen();
    expect(getByTestId(REWARDS_VIP_TIERS_VIEW_TEST_IDS.LIST)).toBeOnTheScreen();
    expect(queryByText('Default')).toBeNull();
    expect(getByText('Mock Tier Alpha 3')).toBeOnTheScreen();
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
      if (selector === selectVipProgramEnabled) return true;
      return undefined;
    });

    const { queryByTestId } = render(<RewardsVipTiersView />);
    expect(queryByTestId(REWARDS_VIP_TIERS_VIEW_TEST_IDS.ROOT)).toBeNull();
    await waitFor(() => {
      expect(mockExitRewardsFlow).toHaveBeenCalled();
    });
  });

  it('exits the rewards flow when the VIP program flag is off, even for a VIP subscription', async () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId)
        return 'test-subscription-id';
      if (selector === selectIsCurrentSubscriptionVipEnabled) return true;
      if (selector === selectVipProgramEnabled) return false;
      return undefined;
    });

    const { queryByTestId } = render(<RewardsVipTiersView />);
    expect(queryByTestId(REWARDS_VIP_TIERS_VIEW_TEST_IDS.ROOT)).toBeNull();
    await waitFor(() => {
      expect(mockExitRewardsFlow).toHaveBeenCalled();
    });
  });
});
