import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectVipProgramEnabled } from '../../../../selectors/featureFlagController/vipProgram';
import {
  selectIsVipReferee,
  selectReferredByVipCode,
} from '../../../../reducers/rewards/selectors';
import { VIP_REFEREE_SPLASH_SCREEN_TEST_IDS } from '../components/Vip/VipSplashScreenLayout';
import RewardsVipRefereeSplashView from './RewardsVipRefereeSplashView';
import { strings } from '../../../../../locales/i18n';

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
    useRoute: () => ({
      key: 'RewardsVipRefereeSplashView',
      name: 'RewardsVipRefereeSplashView',
      params: undefined,
    }),
  };
});

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
      if (selector === selectIsVipReferee) return mockIsVipReferee;
      if (selector === selectReferredByVipCode) return mockReferredByVipCode;

      return (
        selector as (
          state: ReturnType<typeof getRewardsSelectorState>,
        ) => unknown
      )(getRewardsSelectorState());
    });
  });

  it('renders the referee splash with the referred-by code when not accepted', () => {
    const { getByTestId } = render(<RewardsVipRefereeSplashView />);

    expect(
      getByTestId(VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.TITLE),
    ).toHaveTextContent(strings('rewards.vip.splash_title'));
    expect(
      getByTestId(VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.DESCRIPTION),
    ).toHaveTextContent(strings('rewards.vip.splash_description'));
    expect(
      getByTestId(VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.REFERRED_BY),
    ).toHaveTextContent(
      strings('rewards.vip.referee_referred_by', {
        code: mockReferredByVipCode,
      }),
    );
    expect(
      getByTestId(VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.CONTINUE_BUTTON),
    ).toHaveTextContent(strings('rewards.vip.referee_splash_continue'));
    expect(
      getByTestId(VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.NOT_NOW_BUTTON),
    ).toHaveTextContent(strings('rewards.vip.splash_not_now'));
  });

  it('omits the referred-by footer when no referral code is available', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) return mockSubscriptionId;
      if (selector === selectVipProgramEnabled) return mockIsVipProgramEnabled;
      if (selector === selectIsVipReferee) return mockIsVipReferee;
      if (selector === selectReferredByVipCode) return null;

      return (
        selector as (
          state: ReturnType<typeof getRewardsSelectorState>,
        ) => unknown
      )(getRewardsSelectorState());
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
