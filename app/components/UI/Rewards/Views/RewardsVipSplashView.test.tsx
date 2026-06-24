import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import { selectVipProgramEnabled } from '../../../../selectors/featureFlagController/vipProgram';
import { VIP_SPLASH_SCREEN_TEST_IDS } from '../components/Vip/VipSplashScreenLayout';
import { useVipDashboard } from '../hooks/useVipDashboard';
import RewardsVipSplashView from './RewardsVipSplashView';

const mockNavigateDispatch = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockExitRewardsFlow = jest.fn();
const mockSubscriptionId = 'test-subscription-id';
let mockIsVipEnabled = true;
let mockIsVipProgramEnabled = true;
let mockCanGoBack = true;
let mockVipSplashAccepted: Record<string, boolean> = {};

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
    TextVariant: { BodyMd: 'bodyMd' },
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
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.vip.splash_title': 'WELCOME\nTO MOCK\nVIP PROGRAM',
      'rewards.vip.splash_description':
        'Placeholder splash copy for tests only. Not representative of the live program.',
      'rewards.vip.splash_accept_invite': 'Accept invite',
      'rewards.vip.splash_not_now': 'Not now',
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
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../hooks/useVipDashboard', () => ({
  useVipDashboard: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseVipDashboard = useVipDashboard as jest.MockedFunction<
  typeof useVipDashboard
>;

const getRewardsSelectorState = () => ({
  rewards: {
    vipSplashAccepted: mockVipSplashAccepted,
  },
});

describe('RewardsVipSplashView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsVipEnabled = true;
    mockIsVipProgramEnabled = true;
    mockCanGoBack = true;
    mockVipSplashAccepted = {};
    mockUseVipDashboard.mockReturnValue({
      dashboard: null,
      isLoading: false,
      hasError: false,
      hasAttemptedFetch: true,
      fetchVipDashboard: jest.fn(),
    });
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) return mockSubscriptionId;
      if (selector === selectIsCurrentSubscriptionVipEnabled) {
        return mockIsVipEnabled;
      }
      if (selector === selectVipProgramEnabled) {
        return mockIsVipProgramEnabled;
      }

      return (
        selector as (
          state: ReturnType<typeof getRewardsSelectorState>,
        ) => unknown
      )(getRewardsSelectorState());
    });
  });

  it('renders the VIP splash when the invite has not been accepted', () => {
    const { getAllByText, getByTestId, getByText } = render(
      <RewardsVipSplashView />,
    );

    expect(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(getAllByText('WELCOME\nTO MOCK\nVIP PROGRAM')[0]).toBeOnTheScreen();
    expect(
      getByText(
        'Placeholder splash copy for tests only. Not representative of the live program.',
      ),
    ).toBeOnTheScreen();
    expect(mockUseVipDashboard).toHaveBeenCalled();
  });

  it('replaces with VIP view and lets VIP view accept the invite', () => {
    const { getByTestId } = render(<RewardsVipSplashView />);

    fireEvent.press(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.ACCEPT_BUTTON));

    expect(mockNavigateDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.REWARDS_VIP_VIEW),
    );
  });

  it('exits the rewards flow when not now is pressed', () => {
    const { getByTestId } = render(<RewardsVipSplashView />);

    fireEvent.press(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.NOT_NOW_BUTTON));

    expect(mockExitRewardsFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        canGoBack: expect.any(Function),
        goBack: mockGoBack,
        navigate: mockNavigate,
      }),
    );
  });

  it('exits the rewards flow on not now even when there is no back route', () => {
    mockCanGoBack = false;

    const { getByTestId } = render(<RewardsVipSplashView />);

    fireEvent.press(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.NOT_NOW_BUTTON));

    expect(mockExitRewardsFlow).toHaveBeenCalled();
  });

  it('replaces with VIP view when the invite is already accepted', () => {
    mockVipSplashAccepted = { [mockSubscriptionId]: true };

    const { queryByTestId } = render(<RewardsVipSplashView />);

    expect(queryByTestId(VIP_SPLASH_SCREEN_TEST_IDS.CONTAINER)).toBeNull();
    expect(mockNavigateDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.REWARDS_VIP_VIEW),
    );
  });

  it('exits the rewards flow when the user cannot view VIP', () => {
    mockIsVipEnabled = false;

    const { queryByTestId } = render(<RewardsVipSplashView />);

    expect(queryByTestId(VIP_SPLASH_SCREEN_TEST_IDS.CONTAINER)).toBeNull();
    expect(mockExitRewardsFlow).toHaveBeenCalled();
  });

  it('exits the rewards flow when the VIP program flag is off, even if the subscription is VIP', () => {
    mockIsVipProgramEnabled = false;

    const { queryByTestId } = render(<RewardsVipSplashView />);

    expect(queryByTestId(VIP_SPLASH_SCREEN_TEST_IDS.CONTAINER)).toBeNull();
    expect(mockExitRewardsFlow).toHaveBeenCalled();
  });
});
