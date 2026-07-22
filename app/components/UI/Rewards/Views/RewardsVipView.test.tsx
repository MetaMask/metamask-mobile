import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { acceptVipInvite } from '../../../../reducers/rewards';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import { selectVipProgramEnabled } from '../../../../selectors/featureFlagController/vipProgram';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { useVipDashboard } from '../hooks/useVipDashboard';
import type { VipDashboardState } from '../../../../core/Engine/controllers/rewards-controller/types';
import RewardsVipView, { REWARDS_VIP_VIEW_TEST_IDS } from './RewardsVipView';
import { VIP_TIER_PROGRESS_CARD_TEST_IDS } from '../components/Vip/VipTierProgressCard';
import { VIP_VOLUME_SECTION_TEST_IDS } from '../components/Vip/VipVolumeSection';
import { VIP_SWAPS_VOLUME_INFO_SHEET_TEST_IDS } from '../components/Vip/VipSwapsVolumeInfoSheet';
import { VIP_POINTS_SECTION_TEST_IDS } from '../components/Vip/VipPointsSection';
import { VIP_FEE_TILE_TEST_IDS } from '../components/Vip/VipFeeTile';

const mockDispatch = jest.fn();
const mockReduxDispatch = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockExitRewardsFlow = jest.fn();
let mockVipSplashAccepted: Record<string, boolean> = {};

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(() => mockReduxDispatch),
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
    ButtonIcon: ({
      onPress,
      testID,
      accessibilityLabel,
    }: {
      onPress?: () => void;
      testID?: string;
      accessibilityLabel?: string;
    }) =>
      ReactActual.createElement(Pressable, {
        testID,
        accessibilityLabel,
        onPress,
      }),
    ButtonIconSize: { Sm: 'sm', Md: 'md', Lg: 'lg' },
    IconColor: {
      IconDefault: 'default',
      IconAlternative: 'alt',
      SuccessDefault: 'success',
      WarningDefault: 'warning',
    },
    IconName: {
      Activity: 'Activity',
      ArrowDown: 'ArrowDown',
      ArrowRight: 'ArrowRight',
      ArrowUp: 'ArrowUp',
      Close: 'Close',
      Info: 'Info',
      MetamaskFoxOutline: 'MetamaskFoxOutline',
      TrendUp: 'TrendUp',
      UserCircleAdd: 'UserCircleAdd',
    },
    IconSize: { Sm: 'sm', Md: 'md', Lg: 'lg', Xl: 'xl' },
    BottomSheet: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { testID }, children),
    Skeleton,
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const ReactActual = jest.requireActual('react');
  return {
    useTailwind: () => ({
      style: (...args: unknown[]) => args,
      color: () => 'rgb(0,200,80)',
    }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
    Theme: { Light: 'light', Dark: 'dark' },
  };
});

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
    if (key === 'rewards.vip.equity_rebate_header' && params) {
      return `Equity rebate: ${params.value}%`;
    }
    if (key === 'rewards.vip.equity_rebate_next_tier' && params) {
      return `↑ ${params.value}% at next tier`;
    }
    if (key === 'rewards.vip.progress_to_next_tier' && params) {
      return `${params.pointsRemaining} points to next tier`;
    }
    const translations: Record<string, string> = {
      'rewards.vip.swaps_label': 'Swaps',
      'rewards.vip.perps_label': 'Perps',
      'rewards.vip.tier_benefits_title': 'Tier benefits',
      'rewards.vip.bps_unit': 'bps',
      'rewards.vip.equity_rebate_label': 'Equity rebate',
      'rewards.vip.equity_rebate_top_tier': 'Top tier reached.',
      'rewards.vip.error_title': 'Error title',
      'rewards.vip.error_description': 'Error description',
      'rewards.vip.retry_button': 'Retry',
      'rewards.vip.swaps_volume_info_label': 'Swaps volume information',
      'rewards.vip.swaps_volume_info_title': 'Swaps volume',
      'rewards.vip.swaps_volume_info_description':
        'Your swaps volume updates once per day, so recent swaps may take up to 24 hours to appear here.',
    };
    return translations[key] ?? key;
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
      id: 'mock-tier-alpha-3',
      name: 'Mock Tier Alpha 3',
      tier: 3,
      pointsRequirement: 222_222,
      revenueShareBps: 1200,
      swapsBps: 42.5,
      perpsBps: 7,
      referralCarryoverBps: 4242,
      status: 'current',
    },
    {
      id: 'mock-tier-alpha-4',
      name: 'Mock Tier Alpha 4',
      tier: 4,
      pointsRequirement: 333_333,
      revenueShareBps: 1300,
      swapsBps: 11,
      perpsBps: 6,
      referralCarryoverBps: 5151,
      status: 'upcoming',
    },
  ],
  localizedText: {
    periodTitle: 'Jun 1 - Jun 30',
    memberIdTitle: 'Member ID',
    transactionsTitle: 'Transactions',
    swapsFeeTitle: 'Swaps fee',
    perpsFeeTitle: 'Perps fee',
    revenueShareTitle: 'Revenue share',
    referralPointsTitle: 'Referral points',
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
    topTierDescription: 'Top tier reached',
    nextTierSwapsFeeDelta: '↓ 9 bps next tier',
    nextTierPerpsFeeDelta: '↓ 6 bps next tier',
    nextTierRevenueShareDelta: '↑ 1% next tier',
    nextTierReferralPointsDelta: '↑ 42% next tier',
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
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockUseTrackRewardsPageView =
  useTrackRewardsPageView as jest.MockedFunction<
    typeof useTrackRewardsPageView
  >;

const getRewardsSelectorState = () => ({
  user: {
    appTheme: 'dark',
  },
  rewards: {
    referralCode: null,
    vipSplashAccepted: mockVipSplashAccepted,
  },
});

const mockSubscribed = () => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) return 'test-subscription-id';
    if (selector === selectIsCurrentSubscriptionVipEnabled) return true;
    if (selector === selectVipProgramEnabled) return true;
    return (
      selector as (state: ReturnType<typeof getRewardsSelectorState>) => unknown
    )(getRewardsSelectorState());
  });
};

describe('RewardsVipView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVipSplashAccepted = {};
    mockUseDispatch.mockReturnValue(mockReduxDispatch);
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

  it('accepts the VIP invite on mount when it has not been accepted', () => {
    render(<RewardsVipView />);

    expect(mockReduxDispatch).toHaveBeenCalledWith(
      acceptVipInvite({ subscriptionId: 'test-subscription-id' }),
    );
  });

  it('does not accept the VIP invite again when it was already accepted', () => {
    mockVipSplashAccepted = { 'test-subscription-id': true };

    render(<RewardsVipView />);

    expect(mockReduxDispatch).not.toHaveBeenCalledWith(
      acceptVipInvite({ subscriptionId: 'test-subscription-id' }),
    );
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
    expect(getAllByText('Acme Rewards Beta')[0]).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIP_VIEW_TEST_IDS.INVITE_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIP_VIEW_TEST_IDS.TRANSACTIONS_BUTTON),
    ).toBeOnTheScreen();
    expect(mockUseTrackRewardsPageView).toHaveBeenCalledWith({
      page_type: 'vip',
      enabled: true,
    });
  });

  it('navigates to VIP transactions view when the transactions button is pressed', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: defaultDashboard,
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipDashboard: mockFetch,
    });

    const { getByTestId } = render(<RewardsVipView />);

    fireEvent.press(getByTestId(REWARDS_VIP_VIEW_TEST_IDS.TRANSACTIONS_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_VIP_TRANSACTIONS_VIEW,
    );
  });

  it('renders the "Last updated" row when computedAt is present', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: defaultDashboard,
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipDashboard: mockFetch,
    });

    const { getByTestId } = render(<RewardsVipView />);

    expect(
      getByTestId(REWARDS_VIP_VIEW_TEST_IDS.LAST_UPDATED),
    ).toBeOnTheScreen();
  });

  it('does not render the "Last updated" row when computedAt is null', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: { ...defaultDashboard, computedAt: null },
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipDashboard: mockFetch,
    });

    const { queryByTestId } = render(<RewardsVipView />);

    expect(queryByTestId(REWARDS_VIP_VIEW_TEST_IDS.LAST_UPDATED)).toBeNull();
  });

  it('renders skeleton placeholders while loading without dashboard data', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: null,
      isLoading: true,
      hasError: false,
      hasAttemptedFetch: false,
      fetchVipDashboard: mockFetch,
    });

    const { getAllByTestId, getByTestId } = render(<RewardsVipView />);

    expect(getByTestId(REWARDS_VIP_VIEW_TEST_IDS.SKELETON)).toBeOnTheScreen();
    expect(
      getAllByTestId(REWARDS_VIP_VIEW_TEST_IDS.FEE_TILE_SKELETON),
    ).toHaveLength(4);
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
    expect(getByText('Mock Tier Alpha 3')).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIP_VIEW_TEST_IDS.TIER_BENEFITS_CAROUSEL),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIP_VIEW_TEST_IDS.REVENUE_SHARE_TILE),
    ).toBeOnTheScreen();
    expect(getByText('Revenue share')).toBeOnTheScreen();
    expect(getByText('↑ 1% next tier')).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIP_VIEW_TEST_IDS.SWAPS_FEE_TILE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIP_VIEW_TEST_IDS.PERPS_FEE_TILE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIP_VIEW_TEST_IDS.REFERRAL_POINTS_TILE),
    ).toBeOnTheScreen();
    expect(getByText('Referral points')).toBeOnTheScreen();
    expect(getByText('↑ 42% next tier')).toBeOnTheScreen();
    expect(
      getByTestId(VIP_VOLUME_SECTION_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VIP_POINTS_SECTION_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the swaps volume help icon and opens the daily-refresh info sheet on press', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: defaultDashboard,
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipDashboard: mockFetch,
    });

    const { getByTestId, queryByTestId } = render(<RewardsVipView />);

    // The info sheet is not mounted until the help icon is pressed.
    expect(
      queryByTestId(VIP_SWAPS_VOLUME_INFO_SHEET_TEST_IDS.SHEET),
    ).toBeNull();

    fireEvent.press(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.SWAPS_INFO));

    const sheet = getByTestId(VIP_SWAPS_VOLUME_INFO_SHEET_TEST_IDS.SHEET);
    expect(sheet).toHaveTextContent(/Swaps volume/);
    expect(sheet).toHaveTextContent(/updates once per day/);
  });

  it('renders an up arrow when next-tier revenue share equals current revenue share', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: {
        ...defaultDashboard,
        fees: {
          ...defaultDashboard.fees,
          revenueShareBps: 99,
          nextTierRevenueShareBps: 99,
        },
        localizedText: {
          ...defaultDashboard.localizedText,
          nextTierRevenueShareDelta: '↑ 0.99% next tier',
        },
      },
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipDashboard: mockFetch,
    });

    const { getByText } = render(<RewardsVipView />);

    expect(getByText('↑ 0.99% next tier')).toBeOnTheScreen();
  });

  it('hides the revenue share next-tier label when the user is on the top tier', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: {
        ...defaultDashboard,
        currentTier: {
          id: 'mock-tier-alpha-8',
          name: 'Mock Tier Alpha 8',
          tier: 8,
        },
        nextTier: {
          id: 'mock-tier-alpha-8',
          name: 'Mock Tier Alpha 8',
          tier: 8,
        },
        progress: {
          percent: 100,
          remainingPointsToNextTier: 0,
          status: 'top_tier',
        },
        fees: {
          ...defaultDashboard.fees,
          revenueShareBps: 456,
          nextTierRevenueShareBps: 456,
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
    expect(
      getByTestId(VIP_TIER_PROGRESS_CARD_TEST_IDS.SUBLINE),
    ).toHaveTextContent('Top tier reached');
    // Revenue share tile drops its next-tier row on the top tier while the
    // swap, perps, and referral points tiles keep theirs (still sourced from
    // the backend).
    expect(getAllByTestId(VIP_FEE_TILE_TEST_IDS.NEXT)).toHaveLength(3);
  });

  it('does not render the equity rebate tile', () => {
    mockUseVipDashboard.mockReturnValue({
      dashboard: defaultDashboard,
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipDashboard: mockFetch,
    });

    const { queryByTestId } = render(<RewardsVipView />);

    expect(
      queryByTestId(REWARDS_VIP_VIEW_TEST_IDS.EQUITY_REBATE_TILE),
    ).toBeNull();
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
        program: { id: 'mock-vip-program', name: 'Acme Rewards Beta — Custom' },
        localizedText: {
          memberIdTitle: 'Member ID',
          transactionsTitle: 'Transactions',
          swapsFeeTitle: 'Swap fees',
          perpsFeeTitle: 'Perp fees',
          revenueShareTitle: 'Revenue',
          referralPointsTitle: 'Referral points',
          statsTitle: 'Volume V2',
          pointsTitle: 'Points V2',
          swapsVolumeTitle: 'Swaps Volume V2',
          pointsFromReferralsTitle: 'Referral Points V2',
          perpsVolumeTitle: 'Perps Volume V2',
          vipReferralsTitle: 'VIP Referrals V2',
          totalPointsTitle: 'Pts',
          periodTitle: 'Jul 1 - Jul 31',
          equityLockedTitle: 'Allocation',
          equityLockedDescription: 'Body copy',
          equityUnlockedTitle: 'Unlocked allocation',
          equityUnlockedDescription: 'Unlocked body copy',
          topTierDescription: 'Top tier reached custom',
          nextTierSwapsFeeDelta: '↓ 9',
          nextTierPerpsFeeDelta: '↓ 6',
          nextTierRevenueShareDelta: '↑ 1% next tier',
          nextTierReferralPointsDelta: '↑ 42% next tier',
        },
      },
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipDashboard: mockFetch,
    });

    const { getAllByText, getByText } = render(<RewardsVipView />);
    expect(getAllByText('Acme Rewards Beta — Custom')[0]).toBeOnTheScreen();
    expect(getByText('123.46k points to next tier')).toBeOnTheScreen();
    expect(getByText('Swap fees')).toBeOnTheScreen();
    expect(getByText('Perp fees')).toBeOnTheScreen();
    expect(getByText('Revenue')).toBeOnTheScreen();
    expect(getByText('Referral points')).toBeOnTheScreen();
    expect(getByText('↑ 1% next tier')).toBeOnTheScreen();
    expect(getByText('↑ 42% next tier')).toBeOnTheScreen();
    expect(getByText('Volume V2')).toBeOnTheScreen();
    expect(getByText('Points V2')).toBeOnTheScreen();
    expect(getByText('Swaps Volume V2')).toBeOnTheScreen();
    expect(getByText('Perps Volume V2')).toBeOnTheScreen();
    expect(getByText('Referral Points V2')).toBeOnTheScreen();
    expect(getByText('VIP Referrals V2')).toBeOnTheScreen();
    expect(getByText('Jul 1 - Jul 31')).toBeOnTheScreen();
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
      if (selector === selectVipProgramEnabled) {
        return true;
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
      expect(mockExitRewardsFlow).toHaveBeenCalled();
    });
  });

  it('exits the rewards flow when the VIP program flag is off, even for a VIP subscription', async () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) {
        return 'test-subscription-id';
      }
      if (selector === selectIsCurrentSubscriptionVipEnabled) {
        return true;
      }
      if (selector === selectVipProgramEnabled) {
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
      expect(mockExitRewardsFlow).toHaveBeenCalled();
    });
  });
});
