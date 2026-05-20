import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { useVipDashboard } from '../hooks/useVipDashboard';
import type { VipDashboardState } from '../../../../core/Engine/controllers/rewards-controller/types';
import RewardsVipView, { REWARDS_VIP_VIEW_TEST_IDS } from './RewardsVipView';
import { VIP_TIER_PROGRESS_CARD_TEST_IDS } from '../components/Vip/VipTierProgressCard';
import { VIP_VOLUME_SECTION_TEST_IDS } from '../components/Vip/VipVolumeSection';
import { VIP_POINTS_SECTION_TEST_IDS } from '../components/Vip/VipPointsSection';
import { VIP_FEE_TILE_TEST_IDS } from '../components/Vip/VipFeeTile';

const mockDispatch = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

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
    backButtonProps,
    endButtonIconProps,
  }: {
    title: string;
    onBack: () => void;
    backButtonProps?: { testID?: string };
    endButtonIconProps?: {
      iconName: string;
      onPress: () => void;
      testID?: string;
    }[];
  }) =>
    ReactActual.createElement(
      View,
      null,
      ReactActual.createElement(Text, null, title),
      ReactActual.createElement(Pressable, {
        ...backButtonProps,
        onPress: onBack,
      }),
      (endButtonIconProps ?? []).map((p, i) =>
        ReactActual.createElement(Pressable, {
          key: i,
          testID: p.testID,
          onPress: p.onPress,
        }),
      ),
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
      TextDefault: 'default',
      TextAlternative: 'alt',
      SuccessDefault: 'success',
      WarningDefault: 'warning',
    },
    TextVariant: {
      DisplayMd: 'displayMd',
      HeadingLg: 'headingLg',
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
      SuccessDefault: 'success',
      WarningDefault: 'warning',
    },
    IconName: {
      ArrowDown: 'ArrowDown',
      ArrowRight: 'ArrowRight',
      ArrowUp: 'ArrowUp',
      MetamaskFoxOutline: 'MetamaskFoxOutline',
      TrendUp: 'TrendUp',
      UserCircleAdd: 'UserCircleAdd',
    },
    IconSize: { Sm: 'sm', Md: 'md', Lg: 'lg' },
    Skeleton,
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...args: unknown[]) => args,
    color: () => 'rgb(0,200,80)',
  }),
}));

jest.mock('react-native-svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Stub = (props: { testID?: string }) =>
    ReactActual.createElement(View, props);
  return { __esModule: true, default: Stub, Svg: Stub, Circle: Stub };
});

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (key === 'rewards.vip.next_tier_value' && params) {
      return `${params.value} next tier`;
    }
    const translations: Record<string, string> = {
      'rewards.vip.swaps_label': 'Swaps',
      'rewards.vip.perps_label': 'Perps',
      'rewards.vip.tier_benefits_title': 'Tier benefits',
      'rewards.vip.bps_unit': 'bps',
      'rewards.vip.error_title': 'Error title',
      'rewards.vip.error_description': 'Error description',
      'rewards.vip.retry_button': 'Retry',
    };
    return translations[key] ?? key;
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

jest.mock('../hooks/useTrackRewardsPageView', () => jest.fn());

const defaultDashboard: VipDashboardState = {
  program: { id: 'p1', name: 'VIP Pilot' },
  period: {
    start: '2026-04-11T00:00:00.000Z',
    end: '2026-05-11T23:59:59.999Z',
  },
  currentTier: { id: 't3', name: 'Gold Fox VIP 3', tier: 3 },
  nextTier: { id: 't4', name: 'Gold Fox VIP 4', tier: 4 },
  progress: {
    percent: 72,
    remainingPointsToNextTier: 800_000,
    status: 'on_track',
  },
  fees: {
    revenueShareBps: 150,
    swapsBps: 15,
    perpsBps: 4,
    nextTierRevenueShareBps: 200,
    nextTierSwapsBps: 12,
    nextTierPerpsBps: 3,
  },
  volume: {
    swapsUsd: 4_100_000,
    perpsUsd: 2_300_000,
    points: 24_400_000,
    pointsFromReferrals: 500_000,
    referrals: 2,
    referralsCap: 10,
  },
  pointsAllocation: { earned: 24_400_000, max: 100_000_000, percent: 24.4 },
  tiers: [],
  localizedText: {
    period: 'Mar 31 - Apr 30',
    progressToNextTier: '$800K Swaps • $3.6M Perps to Gold Fox VIP 4',
    memberIdTitle: 'Member ID',
    swapsFeeTitle: 'Swaps fee',
    perpsFeeTitle: 'Perps fee',
    nextTierSwapsFeeDelta: '↓ 12 bps next tier',
    nextTierPerpsFeeDelta: '↓ 3 bps next tier',
    revenueShareTitle: 'Revenue share',
    nextTierRevenueShareDelta: '↑ 2% next tier',
    statsTitle: 'Volume',
    statusMessage: 'On track to reach the next tier in 4 days',
    pointsTitle: 'Points',
    pointsAllocationTitle: 'Earn VIP allocations',
    pointsAllocationDescription: 'Body copy',
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
    return undefined;
  });
};

describe('RewardsVipView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockSubscribed();
    mockUseVipDashboard.mockReturnValue({
      dashboard: null,
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipDashboard: mockFetch,
    });
  });

  it('renders the guarded VIP shell with the pilot title and invite button', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: defaultDashboard,
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipDashboard: mockFetch,
    });

    const { getAllByText, getByTestId } = render(<RewardsVipView />);

    expect(getByTestId(REWARDS_VIEW_SELECTORS.VIP_VIEW)).toBeOnTheScreen();
    expect(getAllByText('VIP Pilot')[0]).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIP_VIEW_TEST_IDS.INVITE_BUTTON),
    ).toBeOnTheScreen();
    expect(mockUseTrackRewardsPageView).toHaveBeenCalledWith({
      page_type: 'vip',
      enabled: true,
    });
  });

  it('renders skeleton placeholders while loading without dashboard data', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: null,
      isLoading: true,
      hasError: false,
      hasAttemptedFetch: false,
      fetchVipDashboard: mockFetch,
    });

    const { getByTestId } = render(<RewardsVipView />);

    expect(getByTestId(REWARDS_VIP_VIEW_TEST_IDS.SKELETON)).toBeOnTheScreen();
  });

  it('renders skeleton on the pre-fetch idle window so there is no blank flash', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: null,
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: false,
      fetchVipDashboard: mockFetch,
    });

    const { getByTestId } = render(<RewardsVipView />);

    expect(getByTestId(REWARDS_VIP_VIEW_TEST_IDS.SKELETON)).toBeOnTheScreen();
  });

  it('renders the error banner with a retry that calls fetchVipDashboard', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: null,
      isLoading: false,
      hasError: true,
      hasAttemptedFetch: true,
      fetchVipDashboard: mockFetch,
    });

    const { getByTestId } = render(<RewardsVipView />);

    expect(getByTestId(REWARDS_VIP_VIEW_TEST_IDS.ERROR)).toBeOnTheScreen();
    fireEvent.press(getByTestId(`${REWARDS_VIP_VIEW_TEST_IDS.ERROR}-retry`));
    expect(mockFetch).toHaveBeenCalled();
  });

  it('renders all dashboard sections when data is present', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: defaultDashboard,
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipDashboard: mockFetch,
    });

    const { getByTestId, getByText } = render(<RewardsVipView />);

    expect(
      getByTestId(VIP_TIER_PROGRESS_CARD_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('Gold Fox VIP 3')).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIP_VIEW_TEST_IDS.TIER_BENEFITS_CAROUSEL),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIP_VIEW_TEST_IDS.REVENUE_SHARE_TILE),
    ).toBeOnTheScreen();
    expect(getByText('Revenue share')).toBeOnTheScreen();
    expect(getByText('↑ 2% next tier')).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIP_VIEW_TEST_IDS.SWAPS_FEE_TILE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIP_VIEW_TEST_IDS.PERPS_FEE_TILE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VIP_VOLUME_SECTION_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VIP_POINTS_SECTION_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders an up arrow when next-tier revenue share equals current revenue share', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: {
        ...defaultDashboard,
        fees: {
          ...defaultDashboard.fees,
          revenueShareBps: 150,
          nextTierRevenueShareBps: 150,
        },
        localizedText: {
          ...defaultDashboard.localizedText,
          nextTierRevenueShareDelta: '↑ 1.5% next tier',
        },
      },
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipDashboard: mockFetch,
    });

    const { getByText } = render(<RewardsVipView />);

    expect(getByText('↑ 1.5% next tier')).toBeOnTheScreen();
  });

  it('hides the revenue share next-tier label when the user is on the top tier', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: {
        ...defaultDashboard,
        currentTier: { id: 't8', name: 'Gold Fox VIP 8', tier: 8 },
        nextTier: { id: 't8', name: 'Gold Fox VIP 8', tier: 8 },
        fees: {
          ...defaultDashboard.fees,
          revenueShareBps: 400,
          nextTierRevenueShareBps: 400,
        },
        localizedText: {
          ...defaultDashboard.localizedText,
          nextTierRevenueShareDelta: '',
        },
      },
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipDashboard: mockFetch,
    });

    const { getByTestId, getAllByTestId } = render(<RewardsVipView />);

    expect(
      getByTestId(REWARDS_VIP_VIEW_TEST_IDS.REVENUE_SHARE_TILE),
    ).toBeOnTheScreen();
    // Revenue share tile drops its next-tier row on the top tier while the
    // swap and perps tiles keep theirs (still sourced from the backend).
    expect(getAllByTestId(VIP_FEE_TILE_TEST_IDS.NEXT)).toHaveLength(2);
  });

  it('navigates to the Tiers view when the tier benefits header is tapped', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: defaultDashboard,
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipDashboard: mockFetch,
    });

    const { getByTestId } = render(<RewardsVipView />);
    fireEvent.press(
      getByTestId(REWARDS_VIP_VIEW_TEST_IDS.TIER_BENEFITS_HEADER),
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIP_TIERS_VIEW);
  });

  it('uses backend-provided program.name and localizedText overrides when present', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: {
        ...defaultDashboard,
        program: { id: 'p1', name: 'VIP Pilot — Custom' },
        localizedText: {
          progressToNextTier: 'Backend subline',
          memberIdTitle: 'Member ID',
          swapsFeeTitle: 'Swap fees',
          perpsFeeTitle: 'Perp fees',
          nextTierSwapsFeeDelta: '↓ 12',
          nextTierPerpsFeeDelta: '↓ 3',
          revenueShareTitle: 'Revenue',
          nextTierRevenueShareDelta: '↑ 2% next tier',
          statsTitle: 'Volume V2',
          period: 'Apr 1 - May 1',
          statusMessage: 'Backend status',
          pointsTitle: 'Pts',
          pointsAllocationTitle: 'Allocation',
          pointsAllocationDescription: 'Body copy',
        },
      },
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipDashboard: mockFetch,
    });

    const { getAllByText, getByText } = render(<RewardsVipView />);
    expect(getAllByText('VIP Pilot — Custom')[0]).toBeOnTheScreen();
    expect(getByText('Backend subline')).toBeOnTheScreen();
    expect(getByText('Swap fees')).toBeOnTheScreen();
    expect(getByText('Perp fees')).toBeOnTheScreen();
    expect(getByText('Revenue')).toBeOnTheScreen();
    expect(getByText('↑ 2% next tier')).toBeOnTheScreen();
    expect(getByText('Volume V2')).toBeOnTheScreen();
    expect(getByText('Apr 1 - May 1')).toBeOnTheScreen();
    expect(getByText('Backend status')).toBeOnTheScreen();
    expect(getByText('Pts')).toBeOnTheScreen();
    expect(getByText('Allocation')).toBeOnTheScreen();
  });

  it('redirects subscribed non-VIP users to the rewards dashboard', async () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) {
        return 'test-subscription-id';
      }
      if (selector === selectIsCurrentSubscriptionVipEnabled) {
        return false;
      }
      return undefined;
    });

    const { queryByTestId } = render(<RewardsVipView />);

    expect(queryByTestId(REWARDS_VIEW_SELECTORS.VIP_VIEW)).toBeNull();
    expect(mockUseTrackRewardsPageView).toHaveBeenCalledWith({
      page_type: 'vip',
      enabled: false,
    });
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(Routes.REWARDS_DASHBOARD),
      );
    });
  });
});
