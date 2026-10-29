import React from 'react';
import { CommonActions } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { fireEvent, render } from '@testing-library/react-native';
import ExtendedKeyringTypes from '../../../../constants/keyringTypes';
import configureStore from '../../../../util/test/configureStore';
import Routes from '../../../../constants/navigation/Routes';
import type {
  ReferralLocalizedText,
  ReferralMeDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import RewardsMoneyReferralAcceptedSplashView, {
  REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS,
  fillInviteAcceptedBodyDate,
} from './RewardsMoneyReferralAcceptedSplashView';

const PROFILE_ID = 'profile-1';
const KEYRING_ID = 'entropy-source-1';
const TEST_IDS = REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS;

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockGoBack = jest.fn();

const mockHomeRoute = {
  key: 'home-key',
  name: Routes.HOME_TABS,
};

const mockRootRoutesBeforeDismiss = [
  mockHomeRoute,
  { key: 'old-rewards', name: Routes.REWARDS_VIEW },
  { key: 'rewards-flow', name: Routes.REWARDS_FLOW },
  {
    key: 'splash',
    name: Routes.REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_VIEW,
  },
];

const moneyDashboardReset = CommonActions.reset({
  index: 1,
  routes: [
    mockHomeRoute,
    {
      name: Routes.REWARDS_VIEW,
      params: { screen: Routes.REWARDS_MONEY_DASHBOARD },
    },
  ],
});

const sessionBackgroundState = (profileId: string) => ({
  AuthenticationController: {
    isSignedIn: true,
    srpSessionData: {
      [KEYRING_ID]: { profile: { profileId } },
    },
  },
  KeyringController: {
    isUnlocked: true,
    keyrings: [
      {
        type: ExtendedKeyringTypes.hd,
        accounts: [],
        metadata: { id: KEYRING_ID, name: '' },
      },
    ],
  },
});

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      canGoBack: () => true,
      dispatch: mockDispatch,
      getState: () => ({
        index: mockRootRoutesBeforeDismiss.length - 1,
        routes: mockRootRoutesBeforeDismiss,
      }),
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
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

jest.mock(
  '../components/ThemeImageComponent/RewardsThemeImageComponent',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ accessibilityLabel }: { accessibilityLabel?: string }) =>
        ReactActual.createElement(View, {
          testID: 'theme-image-hero',
          accessibilityLabel,
        }),
    };
  },
);

jest.mock('../../../Views/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

const INVITE_MESSAGE_BODY =
  'Earn up to 50% mUSD back on fees when you trade Swaps and Perps, for a limited time.';

const LOCALIZED_TEXT = {
  inviteMessageBody: INVITE_MESSAGE_BODY,
  inviteAcceptedEyebrow: 'Referral activated',
  inviteAcceptedTitle: 'Your rebate offer is active',
  inviteAcceptedBody:
    'Earn up to 50% mUSD back on eligible Swaps and Perps trades {date}.',
  inviteAcceptedCloseA11y: 'Close referral confirmation',
  inviteAcceptedViewRewards: 'View rewards',
  inviteAcceptedStartTrading: 'Start trading',
  inviteIllustrationLabel: 'Referral invite illustration',
} as unknown as ReferralLocalizedText;

const buildReferralMe = (
  overrides: Partial<ReferralMeDto> = {},
): ReferralMeDto => ({
  roles: ['REFEREE'],
  ui_variant: 'REFEREE',
  user_type: 'REGULAR',
  status: 'ACTIVE',
  referral_code: null,
  referral_code_status: null,
  referred_by: {
    referral_code: 'KOL1',
  },
  earn_rates: {
    cashback_rate_bps: 1000,
    cashback_earning_start: '2026-09-01T00:00:00.000Z',
    cashback_earning_end: '2026-10-24T00:00:00.000Z',
    // Revenue share runs six months. The splash must not date the cashback
    // copy from this.
    revshare_rate_bps: null,
    revshare_earning_start: null,
    revshare_earning_end: '2027-04-01T00:00:00.000Z',
  },
  localized_text: LOCALIZED_TEXT,
  invite_hero: null,
  excluded_regions: [],
  ...overrides,
});

describe('fillInviteAcceptedBodyDate', () => {
  it('fills from the start through the end when both are present', () => {
    expect(
      fillInviteAcceptedBodyDate(
        'Earn rebates {date}.',
        INVITE_MESSAGE_BODY,
        '2026-09-01T00:00:00.000Z',
        '2026-10-24T00:00:00.000Z',
      ),
    ).toMatch(/^Earn rebates from .+ through /);
  });

  it('uses inviteMessageBody when either date is absent', () => {
    expect(
      fillInviteAcceptedBodyDate(
        'Earn rebates {date}.',
        INVITE_MESSAGE_BODY,
        '2026-09-01T00:00:00.000Z',
        null,
      ),
    ).toBe(INVITE_MESSAGE_BODY);
    expect(
      fillInviteAcceptedBodyDate(
        'Earn rebates {date}.',
        INVITE_MESSAGE_BODY,
        null,
        '2026-10-24T00:00:00.000Z',
      ),
    ).toBe(INVITE_MESSAGE_BODY);
  });

  it('uses inviteMessageBody when a date is invalid', () => {
    expect(
      fillInviteAcceptedBodyDate(
        'Earn rebates {date}.',
        INVITE_MESSAGE_BODY,
        '2026-09-01T00:00:00.000Z',
        'not-a-date',
      ),
    ).toBe(INVITE_MESSAGE_BODY);
  });

  it('returns an empty string when the dates and the fallback are missing', () => {
    expect(fillInviteAcceptedBodyDate(undefined, undefined, null, null)).toBe(
      '',
    );
  });
});

describe('RewardsMoneyReferralAcceptedSplashView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderSplash = (referralMe: ReferralMeDto = buildReferralMe()) => {
    const store = configureStore({
      engine: { backgroundState: sessionBackgroundState(PROFILE_ID) },
      rewardsMoney: {
        referralMe: {
          [PROFILE_ID]: { loading: false, error: false, data: referralMe },
        },
      },
    });
    return render(
      <Provider store={store}>
        <RewardsMoneyReferralAcceptedSplashView />
      </Provider>,
    );
  };

  it('renders activation copy through the cashback window end', () => {
    const { getByTestId, getByText } = renderSplash();

    expect(getByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(getByText('Referral activated')).toBeOnTheScreen();
    expect(getByTestId(TEST_IDS.TITLE)).toHaveTextContent(
      'Your rebate offer is active',
    );
    expect(getByTestId(TEST_IDS.BODY).props.children).toMatch(
      /from .+ through .+2026/,
    );
    expect(getByTestId(TEST_IDS.BODY).props.children).not.toMatch(/2027/);
  });

  it('uses inviteMessageBody when a cashback date is missing', () => {
    const { getByTestId } = renderSplash(
      buildReferralMe({
        earn_rates: {
          cashback_rate_bps: 1000,
          cashback_earning_start: null,
          cashback_earning_end: null,
          revshare_rate_bps: null,
          revshare_earning_start: null,
          revshare_earning_end: '2027-04-01T00:00:00.000Z',
        },
      }),
    );

    expect(getByTestId(TEST_IDS.BODY)).toHaveTextContent(INVITE_MESSAGE_BODY);
  });

  it('renders the invite_hero theme image when present', () => {
    const { getByTestId } = renderSplash(
      buildReferralMe({
        invite_hero: {
          lightModeUrl: 'https://example.com/light.png',
          darkModeUrl: 'https://example.com/dark.png',
        },
      }),
    );

    expect(getByTestId('theme-image-hero')).toBeOnTheScreen();
    expect(getByTestId('theme-image-hero')).toHaveProp(
      'accessibilityLabel',
      'Referral invite illustration',
    );
  });

  it('renders no hero when invite_hero is absent', () => {
    const { queryByTestId } = renderSplash();

    expect(queryByTestId('theme-image-hero')).toBeNull();
  });

  it('opens the money dashboard when view rewards is pressed', () => {
    const { getByTestId } = renderSplash();

    fireEvent.press(getByTestId(TEST_IDS.VIEW_REWARDS));

    expect(mockDispatch).toHaveBeenCalledWith(moneyDashboardReset);
  });

  it('opens the money dashboard when the splash is closed', () => {
    const { getByTestId } = renderSplash();

    fireEvent.press(getByTestId(TEST_IDS.CLOSE));

    expect(mockDispatch).toHaveBeenCalledWith(moneyDashboardReset);
  });

  it('opens the trade actions sheet over the money dashboard when start trading is pressed', () => {
    const { getByTestId } = renderSplash();

    fireEvent.press(getByTestId(TEST_IDS.START_TRADING));

    expect(mockDispatch).toHaveBeenCalledWith(moneyDashboardReset);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.TRADE_WALLET_ACTIONS,
      params: { hasBottomNotch: false },
    });
  });
});
