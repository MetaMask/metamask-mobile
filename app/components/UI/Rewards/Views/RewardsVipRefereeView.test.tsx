import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { acceptVipRefereeInvite } from '../../../../reducers/rewards';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { selectVipProgramEnabled } from '../../../../selectors/featureFlagController/vipProgram';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  createMockEventBuilder,
  createMockUseAnalyticsHook,
} from '../../../../util/test/analyticsMock';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { useVipRefereeDashboard } from '../hooks/useVipRefereeDashboard';
import type { VipRefereeMeState } from '../../../../core/Engine/controllers/rewards-controller/types';
import RewardsVipRefereeView, {
  REWARDS_VIP_REFEREE_VIEW_TEST_IDS,
} from './RewardsVipRefereeView';

const mockNavDispatch = jest.fn();
const mockReduxDispatch = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => createMockEventBuilder());
// Obviously-synthetic fixtures — never real VIP codes/figures.
const mockSubscriptionId = 'test-subscription-id';
const mockAccountAddress = '0xAbC0000000000000000000000000000000000123';
let mockIsVipReferee = true;
let mockIsVipProgramEnabled = true;
let mockVipRefereeSplashAccepted: Record<string, boolean> = {};

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(() => mockReduxDispatch),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      dispatch: mockNavDispatch,
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');

  const HeaderStandard = ({
    onBack,
    backButtonProps,
  }: {
    onBack: () => void;
    backButtonProps?: { testID?: string };
  }) =>
    ReactActual.createElement(Pressable, {
      ...backButtonProps,
      onPress: onBack,
    });

  const passthrough = (props: {
    children?: React.ReactNode;
    testID?: string;
  }) =>
    ReactActual.createElement(View, { testID: props.testID }, props.children);

  const Button = ({
    children,
    onPress,
    testID,
    disabled,
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    testID?: string;
    disabled?: boolean;
  }) =>
    ReactActual.createElement(
      Pressable,
      { onPress: disabled ? undefined : onPress, testID, disabled },
      ReactActual.createElement(Text, null, children),
    );

  return {
    HeaderStandard,
    Box: passthrough,
    BoxFlexDirection: { Row: 'row', Column: 'column' },
    Button,
    ButtonVariant: { Primary: 'primary', Secondary: 'secondary' },
    ButtonSize: { Lg: 'lg' },
    IconName: { MessageQuestion: 'MessageQuestion', Export: 'Export' },
    Text: ({ children, ...rest }: { children?: React.ReactNode }) =>
      ReactActual.createElement(Text, rest, children),
    TextColor: { TextDefault: 'default', TextAlternative: 'alt' },
    TextVariant: {
      HeadingLg: 'headingLg',
      HeadingMd: 'headingMd',
      HeadingSm: 'headingSm',
      BodyMd: 'bodyMd',
      BodySm: 'bodySm',
    },
    FontWeight: { Medium: 'medium', Bold: 'bold' },
    Skeleton: (props: { testID?: string }) =>
      ReactActual.createElement(View, props),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const ReactActual = jest.requireActual('react');
  return {
    useTailwind: () => ({
      style: (...args: unknown[]) => args,
      color: () => 'rgb(0,0,0)',
    }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
    Theme: { Light: 'light', Dark: 'dark' },
  };
});

jest.mock('../../../../images/rewards/vip.svg', () => 'VipIcon');

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (key === 'rewards.vip.referee_referred_by') {
      return `Referred by ${params?.code ?? ''}`;
    }
    if (key === 'rewards.vip.referee_points_to_label') {
      return `Points to ${params?.code ?? ''}`;
    }
    const translations: Record<string, string> = {
      'rewards.vip.referee_page_title': 'VIP Pilot',
      'rewards.vip.referee_stats_title': 'Stats',
      'rewards.vip.referee_period_last_30d': 'Last 30d',
      'rewards.vip.referee_swaps_volume_label': 'Swaps volume',
      'rewards.vip.referee_perps_volume_label': 'Perps volume',
      'rewards.vip.referee_error_title': 'Error title',
      'rewards.vip.referee_error_description': 'Error description',
      'rewards.vip.referee_contact_support': 'Contact support',
      'app_settings.contact_support': 'Contact support',
      'rewards.vip.retry_button': 'Retry',
    };
    return translations[key] ?? key;
  }),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountFormattedAddress: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/vipProgram', () => ({
  selectVipProgramEnabled: jest.fn(),
}));

jest.mock('../../../Views/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../components/RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ title, testID }: { title: string; testID?: string }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(Text, null, title),
      ),
  };
});

jest.mock('../hooks/useTrackRewardsPageView', () => jest.fn());

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('../hooks/useVipRefereeDashboard', () => ({
  useVipRefereeDashboard: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockUseTrack = useTrackRewardsPageView as jest.MockedFunction<
  typeof useTrackRewardsPageView
>;
const mockUseVipRefereeDashboard =
  useVipRefereeDashboard as jest.MockedFunction<typeof useVipRefereeDashboard>;
const mockFetch = jest.fn();

const defaultDashboard: VipRefereeMeState = {
  referredByCode: 'TESTCODE',
  points: 1234,
  swapsVolume: 1000,
  perpsVolume: 2000,
  computedAt: '2099-06-30T14:52:00.000Z',
  lastFetched: 0,
};

const getRewardsSelectorState = () => ({
  user: {
    appTheme: 'dark',
  },
  rewards: {
    isVipReferee: mockIsVipReferee,
    vipRefereeSplashAccepted: mockVipRefereeSplashAccepted,
  },
});

describe('RewardsVipRefereeView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsVipReferee = true;
    mockIsVipProgramEnabled = true;
    mockVipRefereeSplashAccepted = {};
    mockUseDispatch.mockReturnValue(mockReduxDispatch);
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) return mockSubscriptionId;
      if (selector === selectSelectedInternalAccountFormattedAddress)
        return mockAccountAddress;
      if (selector === selectVipProgramEnabled) return mockIsVipProgramEnabled;
      return (
        selector as (
          state: ReturnType<typeof getRewardsSelectorState>,
        ) => unknown
      )(getRewardsSelectorState());
    });
    mockUseVipRefereeDashboard.mockReturnValue({
      dashboard: defaultDashboard,
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipRefereeDashboard: mockFetch,
    });
  });

  it('persists the referee invite on mount when not yet accepted', () => {
    render(<RewardsVipRefereeView />);

    expect(mockReduxDispatch).toHaveBeenCalledWith(
      acceptVipRefereeInvite({ subscriptionId: mockSubscriptionId }),
    );
  });

  it('does not persist again when already accepted', () => {
    mockVipRefereeSplashAccepted = { [mockSubscriptionId]: true };

    render(<RewardsVipRefereeView />);

    expect(mockReduxDispatch).not.toHaveBeenCalledWith(
      acceptVipRefereeInvite({ subscriptionId: mockSubscriptionId }),
    );
  });

  it('renders the VIP Pilot page with the referred-by code and stat cells', () => {
    const { getByTestId, getByText } = render(<RewardsVipRefereeView />);

    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.VIEW),
    ).toBeOnTheScreen();
    expect(getByText('VIP Pilot')).toBeOnTheScreen();
    expect(getByText('Referred by TESTCODE')).toBeOnTheScreen();
    expect(getByText('Swaps volume')).toBeOnTheScreen();
    expect(getByText('Perps volume')).toBeOnTheScreen();
    expect(getByText('Points to TESTCODE')).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.SWAPS_VOLUME),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.PERPS_VOLUME),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.POINTS_TO),
    ).toBeOnTheScreen();
    expect(mockUseTrack).toHaveBeenCalledWith({
      page_type: 'vip_referee',
      enabled: true,
    });
  });

  it('displays swaps and perps volume in separate stat cells', () => {
    const { getByTestId } = render(<RewardsVipRefereeView />);

    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.SWAPS_VOLUME),
    ).toHaveTextContent(/\$1,000/);
    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.PERPS_VOLUME),
    ).toHaveTextContent(/\$2,000/);
  });

  it('displays dashboard points in the points-to stat cell', () => {
    const { getByTestId } = render(<RewardsVipRefereeView />);

    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.POINTS_TO),
    ).toHaveTextContent(/1,234/);
  });

  it('renders an empty points-to label when referredByCode is missing', () => {
    mockUseVipRefereeDashboard.mockReturnValue({
      dashboard: { ...defaultDashboard, referredByCode: null },
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipRefereeDashboard: mockFetch,
    });

    const { getByText } = render(<RewardsVipRefereeView />);

    expect(getByText('Points to ')).toBeOnTheScreen();
  });

  it('renders the "Last updated" row when computedAt is present', () => {
    const { getByTestId } = render(<RewardsVipRefereeView />);

    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.LAST_UPDATED),
    ).toBeOnTheScreen();
  });

  it('does not render the "Last updated" row when computedAt is null', () => {
    mockUseVipRefereeDashboard.mockReturnValue({
      dashboard: { ...defaultDashboard, computedAt: null },
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipRefereeDashboard: mockFetch,
    });

    const { queryByTestId } = render(<RewardsVipRefereeView />);

    expect(
      queryByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.LAST_UPDATED),
    ).toBeNull();
  });

  it('renders the referred-by card when dashboard data is present', () => {
    const { getByTestId } = render(<RewardsVipRefereeView />);

    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.REFERRED_BY_CARD),
    ).toBeOnTheScreen();
  });

  it('renders the loading skeleton without the contact support button', () => {
    mockUseVipRefereeDashboard.mockReturnValue({
      dashboard: null,
      isLoading: true,
      hasError: false,
      hasAttemptedFetch: false,
      fetchVipRefereeDashboard: mockFetch,
    });

    const { getByTestId, queryByTestId } = render(<RewardsVipRefereeView />);

    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.SKELETON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.CONTACT_SUPPORT_BUTTON),
    ).toBeNull();
  });

  it('does not render the contact support button when the fetch errors with no data', () => {
    mockUseVipRefereeDashboard.mockReturnValue({
      dashboard: null,
      isLoading: false,
      hasError: true,
      hasAttemptedFetch: true,
      fetchVipRefereeDashboard: mockFetch,
    });

    const { getByTestId, queryByTestId } = render(<RewardsVipRefereeView />);

    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.ERROR),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.CONTACT_SUPPORT_BUTTON),
    ).toBeNull();
  });

  it('renders the contact support button', () => {
    const { getByTestId, getByText } = render(<RewardsVipRefereeView />);

    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.CONTACT_SUPPORT_BUTTON),
    ).toBeOnTheScreen();
    expect(getByText('Contact support')).toBeOnTheScreen();
  });

  it('disables the contact support button when the selected account address is missing', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) return mockSubscriptionId;
      if (selector === selectSelectedInternalAccountFormattedAddress)
        return undefined;
      if (selector === selectVipProgramEnabled) return mockIsVipProgramEnabled;
      return (
        selector as (
          state: ReturnType<typeof getRewardsSelectorState>,
        ) => unknown
      )(getRewardsSelectorState());
    });

    const { getByTestId } = render(<RewardsVipRefereeView />);

    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.CONTACT_SUPPORT_BUTTON),
    ).toBeDisabled();
  });

  it('opens the priority support webview tagged as VIP with the account address on press', () => {
    const { getByTestId } = render(<RewardsVipRefereeView />);

    fireEvent.press(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.CONTACT_SUPPORT_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: expect.stringContaining(
          `priority=vip&address=${encodeURIComponent(mockAccountAddress)}`,
        ),
        title: 'Contact support',
      },
    });
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP,
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('does not open support when the selected account address is missing', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) return mockSubscriptionId;
      if (selector === selectSelectedInternalAccountFormattedAddress)
        return undefined;
      if (selector === selectVipProgramEnabled) return mockIsVipProgramEnabled;
      return (
        selector as (
          state: ReturnType<typeof getRewardsSelectorState>,
        ) => unknown
      )(getRewardsSelectorState());
    });

    const { getByTestId } = render(<RewardsVipRefereeView />);

    fireEvent.press(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.CONTACT_SUPPORT_BUTTON),
    );

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('renders the error banner when the fetch errors with no data', () => {
    mockUseVipRefereeDashboard.mockReturnValue({
      dashboard: null,
      isLoading: false,
      hasError: true,
      hasAttemptedFetch: true,
      fetchVipRefereeDashboard: mockFetch,
    });

    const { getByTestId } = render(<RewardsVipRefereeView />);

    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.ERROR),
    ).toBeOnTheScreen();
  });

  it('replaces with the dashboard when the user is not a VIP referee', () => {
    mockIsVipReferee = false;

    const { queryByTestId } = render(<RewardsVipRefereeView />);

    expect(queryByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.VIEW)).toBeNull();
    expect(mockNavDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.REWARDS_DASHBOARD),
    );
  });

  it('replaces with the dashboard when the VIP program flag is off', () => {
    mockIsVipProgramEnabled = false;

    const { queryByTestId } = render(<RewardsVipRefereeView />);

    expect(queryByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.VIEW)).toBeNull();
    expect(mockNavDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.REWARDS_DASHBOARD),
    );
  });
});
