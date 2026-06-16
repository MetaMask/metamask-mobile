import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { acceptVipRefereeInvite } from '../../../../reducers/rewards';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { selectVipProgramEnabled } from '../../../../selectors/featureFlagController/vipProgram';
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
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    testID?: string;
  }) =>
    ReactActual.createElement(
      Pressable,
      { onPress, testID },
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

jest.mock('../../../../images/rewards/vip_splash.png', () => 1);

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (key === 'rewards.vip.referee_referred_by') {
      return `Referred by ${params?.code ?? ''}`;
    }
    const translations: Record<string, string> = {
      'rewards.vip.referee_page_title': 'VIP Pilot',
      'rewards.vip.referee_stats_title': 'Stats',
      'rewards.vip.referee_period_last_30d': 'Last 30d',
      'rewards.vip.referee_points_label': 'Points',
      'rewards.vip.referee_swaps_volume_label': 'Swaps volume',
      'rewards.vip.referee_perps_volume_label': 'Perps volume',
      'rewards.vip.referee_error_title': 'Error title',
      'rewards.vip.referee_error_description': 'Error description',
      'rewards.vip.referee_contact_support': 'Contact priority support',
      'rewards.vip.referee_priority_support_disclaimer':
        'By contacting priority support you will connect your wallet.',
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
    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.POINTS),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.SWAPS_VOLUME),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.PERPS_VOLUME),
    ).toBeOnTheScreen();
    expect(mockUseTrack).toHaveBeenCalledWith({
      page_type: 'vip_referee',
      enabled: true,
    });
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

  it('renders the contact priority support button and disclaimer', () => {
    const { getByTestId, getByText } = render(<RewardsVipRefereeView />);

    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.CONTACT_SUPPORT_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIP_REFEREE_VIEW_TEST_IDS.SUPPORT_DISCLAIMER),
    ).toBeOnTheScreen();
    expect(getByText('Contact priority support')).toBeOnTheScreen();
    expect(
      getByText('By contacting priority support you will connect your wallet.'),
    ).toBeOnTheScreen();
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
          `priority=vip&account=${mockAccountAddress}`,
        ),
        title: 'Contact priority support',
      },
    });
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
