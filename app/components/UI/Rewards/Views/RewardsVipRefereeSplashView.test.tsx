import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectVipProgramEnabled } from '../../../../selectors/featureFlagController/vipProgram';
import { VIP_REFEREE_SPLASH_SCREEN_TEST_IDS } from '../components/Vip/VipSplashScreenLayout';
import RewardsVipRefereeSplashView from './RewardsVipRefereeSplashView';

const mockNavigateDispatch = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockExitRewardsFlow = jest.fn();
// Obviously-synthetic fixtures — never real VIP codes/subscriptions.
const mockSubscriptionId = 'test-subscription-id';
const mockReferredByVipCode = 'TESTCODE';
let mockIsVipReferee = true;
let mockIsVipProgramEnabled = true;
let mockCanGoBack = true;
let mockVipRefereeSplashAccepted: Record<string, boolean> = {};

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
      canGoBack: () => mockCanGoBack,
      dispatch: mockNavigateDispatch,
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { testID }, children),
    FontWeight: { Bold: 'bold', Medium: 'medium' },
    Text: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(Text, props, children),
    TextVariant: { BodyMd: 'bodyMd', BodySm: 'bodySm' },
  };
});

jest.mock('react-native-linear-gradient', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockLinearGradient({
    children,
    testID,
  }: {
    children?: React.ReactNode;
    testID?: string;
  }) {
    return ReactActual.createElement(View, { testID }, children);
  };
});

jest.mock('@react-native-masked-view/masked-view', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockMaskedView({
    children,
    maskElement,
  }: {
    children?: React.ReactNode;
    maskElement?: React.ReactNode;
  }) {
    return ReactActual.createElement(View, null, maskElement, children);
  };
});

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { testID }, children),
  };
});

jest.mock('../../../../images/rewards/vip_splash.png', () => 1);

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, opts?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'rewards.vip.splash_title': 'WELCOME\nTO MOCK\nFOX COLLECTIVE',
      'rewards.vip.splash_description':
        'Placeholder referee splash copy for tests only.',
      'rewards.vip.referee_splash_continue': 'Continue',
      'rewards.vip.splash_not_now': 'Not now',
    };
    if (key === 'rewards.vip.referee_referred_by') {
      return `Referred by ${opts?.code ?? ''}`;
    }
    return translations[key] ?? key;
  }),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/vipProgram', () => ({
  selectVipProgramEnabled: jest.fn(),
}));

jest.mock('../../../Views/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const getRewardsSelectorState = () => ({
  rewards: {
    isVipReferee: mockIsVipReferee,
    referredByVipCode: mockReferredByVipCode,
    vipRefereeSplashAccepted: mockVipRefereeSplashAccepted,
  },
});

describe('RewardsVipRefereeSplashView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsVipReferee = true;
    mockIsVipProgramEnabled = true;
    mockCanGoBack = true;
    mockVipRefereeSplashAccepted = {};
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) return mockSubscriptionId;
      if (selector === selectVipProgramEnabled) return mockIsVipProgramEnabled;

      return (
        selector as (
          state: ReturnType<typeof getRewardsSelectorState>,
        ) => unknown
      )(getRewardsSelectorState());
    });
  });

  it('renders the referee splash with the referred-by code when not accepted', () => {
    const { getAllByText, getByTestId, getByText } = render(
      <RewardsVipRefereeSplashView />,
    );

    expect(
      getByTestId(VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getAllByText('WELCOME\nTO MOCK\nFOX COLLECTIVE')[0],
    ).toBeOnTheScreen();
    expect(getByText('Referred by TESTCODE')).toBeOnTheScreen();
    expect(
      getByTestId(VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.REFERRED_BY),
    ).toBeOnTheScreen();
  });

  it('omits the referred-by footer when no referral code is available', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) return mockSubscriptionId;
      if (selector === selectVipProgramEnabled) return mockIsVipProgramEnabled;

      return (
        selector as (state: {
          rewards: {
            isVipReferee: boolean;
            referredByVipCode: string | null;
            vipRefereeSplashAccepted: Record<string, boolean>;
          };
        }) => unknown
      )({
        rewards: {
          isVipReferee: mockIsVipReferee,
          referredByVipCode: null,
          vipRefereeSplashAccepted: mockVipRefereeSplashAccepted,
        },
      });
    });

    const { queryByTestId } = render(<RewardsVipRefereeSplashView />);

    expect(
      queryByTestId(VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.REFERRED_BY),
    ).toBeNull();
  });

  it('replaces with the referee view when continue is pressed', () => {
    const { getByTestId } = render(<RewardsVipRefereeSplashView />);

    fireEvent.press(
      getByTestId(VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.CONTINUE_BUTTON),
    );

    expect(mockNavigateDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.REWARDS_VIP_REFEREE_VIEW),
    );
  });

  it('exits the rewards flow when not now is pressed', () => {
    const { getByTestId } = render(<RewardsVipRefereeSplashView />);

    fireEvent.press(
      getByTestId(VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.NOT_NOW_BUTTON),
    );

    expect(mockExitRewardsFlow).toHaveBeenCalled();
  });

  it('exits the rewards flow on not now even when there is no back route', () => {
    mockCanGoBack = false;

    const { getByTestId } = render(<RewardsVipRefereeSplashView />);

    fireEvent.press(
      getByTestId(VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.NOT_NOW_BUTTON),
    );

    expect(mockExitRewardsFlow).toHaveBeenCalled();
  });

  it('replaces with the referee view when already accepted', () => {
    mockVipRefereeSplashAccepted = { [mockSubscriptionId]: true };

    const { queryByTestId } = render(<RewardsVipRefereeSplashView />);

    expect(
      queryByTestId(VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.CONTAINER),
    ).toBeNull();
    expect(mockNavigateDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.REWARDS_VIP_REFEREE_VIEW),
    );
  });

  it('exits the rewards flow when the user is not a VIP referee', () => {
    mockIsVipReferee = false;

    const { queryByTestId } = render(<RewardsVipRefereeSplashView />);

    expect(
      queryByTestId(VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.CONTAINER),
    ).toBeNull();
    expect(mockExitRewardsFlow).toHaveBeenCalled();
  });

  it('exits the rewards flow when the VIP program flag is off', () => {
    mockIsVipProgramEnabled = false;

    const { queryByTestId } = render(<RewardsVipRefereeSplashView />);

    expect(
      queryByTestId(VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.CONTAINER),
    ).toBeNull();
    expect(mockExitRewardsFlow).toHaveBeenCalled();
  });
});
