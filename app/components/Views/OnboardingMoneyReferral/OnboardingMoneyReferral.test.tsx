import React from 'react';
import { BackHandler } from 'react-native';
import { Provider } from 'react-redux';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import configureStore from '../../../util/test/configureStore';
import Routes from '../../../constants/navigation/Routes';
import { setReferralMe } from '../../../reducers/rewardsMoney';
import type { ReferralMeDto } from '../../../core/Engine/controllers/rewards-money-controller/types';
import type { NetworkTier } from '../../../util/deviceCapability/types';
import type { UseMoneyReferralInviteParams } from '../../UI/Rewards/hooks/useMoneyReferralInvite';
import OnboardingMoneyReferral, {
  ONBOARDING_MONEY_REFERRAL_LOAD_BUDGET_MS,
} from './OnboardingMoneyReferral';
import { OnboardingMoneyReferralTestIds } from './OnboardingMoneyReferral.testIds';

const PROFILE_ID = 'profile-1';
const REFERRAL_CODE = 'KOL123';

const mockDispatchNavigation = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ dispatch: mockDispatchNavigation }),
  useRoute: () => ({
    key: 'OnboardingMoneyReferral',
    name: 'OnboardingMoneyReferral',
    params: { referralCode: 'KOL123' },
  }),
}));

let mockNetworkTier: NetworkTier | null = 'WIFI';
jest.mock('../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => mockNetworkTier,
}));

const mockFetchReferralMe = jest.fn();
let mockReferralMeProfileId: string | undefined;
jest.mock('../../UI/Rewards/hooks/useReferralMe', () => ({
  useReferralMe: () => ({
    profileId: mockReferralMeProfileId,
    fetchReferralMe: mockFetchReferralMe,
  }),
}));

const mockAccept = jest.fn();
const mockRespond = jest.fn();
const mockOnChangeReferralCode = jest.fn();
let mockInviteParams: UseMoneyReferralInviteParams | undefined;
let mockInviteState = {
  isCopyPending: true,
  canAccept: false,
  isAccepting: false,
  errorMessage: '',
};
jest.mock('../../UI/Rewards/hooks/useMoneyReferralInvite', () => ({
  useMoneyReferralInvite: (params: UseMoneyReferralInviteParams) => {
    mockInviteParams = params;
    return {
      copy: {
        title: "You're invited",
        body: 'Earn mUSD back on fees.',
        codeLabel: 'Referral code',
        accept: 'Continue',
        decline: 'Continue without referral',
      },
      shouldAutoDismiss: false,
      referralCode: params.initialReferralCode,
      onChangeReferralCode: mockOnChangeReferralCode,
      accept: mockAccept,
      respond: mockRespond,
      ...mockInviteState,
    };
  },
}));

const homeReset = {
  type: 'RESET',
  payload: { index: 0, routes: [{ name: Routes.ONBOARDING.HOME_NAV }] },
};

const buildStore = () =>
  configureStore({
    rewardsMoney: {
      referralMe: {},
      pendingReferralCode: REFERRAL_CODE,
      answeredReferralCode: null,
    },
  });

const renderStep = () => {
  const store = buildStore();
  render(
    <Provider store={store}>
      <OnboardingMoneyReferral />
    </Provider>,
  );
  return store;
};

/** A read that settles with a payload, as `useReferralMe` writes it. */
const settleWithPayload =
  (store: ReturnType<typeof buildStore>) => async () => {
    store.dispatch(
      setReferralMe({
        profileId: PROFILE_ID,
        data: { roles: [] } as unknown as ReferralMeDto,
      }),
    );
    return { status: 'settled', profileId: PROFILE_ID };
  };

const flushPromises = () => act(async () => undefined);

describe('OnboardingMoneyReferral', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockNetworkTier = 'WIFI';
    mockReferralMeProfileId = undefined;
    mockInviteParams = undefined;
    mockInviteState = {
      isCopyPending: true,
      canAccept: false,
      isAccepting: false,
      errorMessage: '',
    };
    mockFetchReferralMe.mockReturnValue(new Promise(() => undefined));
    mockRespond.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('offers the route code as an onboarding invite', () => {
    renderStep();

    expect(mockInviteParams).toEqual(
      expect.objectContaining({
        initialReferralCode: REFERRAL_CODE,
        location: 'onboarding',
      }),
    );
    expect(
      screen.getByTestId(OnboardingMoneyReferralTestIds.CODE_INPUT).props.value,
    ).toBe(REFERRAL_CODE);
  });

  it('reads referral-me fresh once on mount', () => {
    renderStep();

    expect(mockFetchReferralMe).toHaveBeenCalledTimes(1);
    expect(mockFetchReferralMe).toHaveBeenCalledWith({ forceFresh: true });
  });

  it('passes the profile the read resolved to the invite', () => {
    mockReferralMeProfileId = PROFILE_ID;

    renderStep();

    expect(mockInviteParams?.profileId).toBe(PROFILE_ID);
  });

  it('shows a skeleton and holds Continue while the copy loads', () => {
    renderStep();

    expect(
      screen.getByTestId(OnboardingMoneyReferralTestIds.COPY_SKELETON),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(OnboardingMoneyReferralTestIds.TITLE),
    ).not.toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(OnboardingMoneyReferralTestIds.CONTINUE_BUTTON),
    );
    expect(mockAccept).not.toHaveBeenCalled();
  });

  it('shows the invite copy once it has loaded', () => {
    mockInviteState = { ...mockInviteState, isCopyPending: false };

    renderStep();

    expect(
      screen.getByTestId(OnboardingMoneyReferralTestIds.TITLE),
    ).toHaveTextContent("You're invited");
    expect(
      screen.getByTestId(OnboardingMoneyReferralTestIds.BODY),
    ).toHaveTextContent('Earn mUSD back on fees.');
    expect(
      screen.queryByTestId(OnboardingMoneyReferralTestIds.COPY_SKELETON),
    ).not.toBeOnTheScreen();
  });

  it('stays on the step when the read settles with a payload', async () => {
    const store = buildStore();
    mockFetchReferralMe.mockImplementation(settleWithPayload(store));
    render(
      <Provider store={store}>
        <OnboardingMoneyReferral />
      </Provider>,
    );

    await flushPromises();

    expect(mockDispatchNavigation).not.toHaveBeenCalled();
    expect(store.getState().rewardsMoney.pendingReferralCode).toBe(
      REFERRAL_CODE,
    );
  });

  it.each([
    [
      'settles without a payload',
      () => Promise.resolve({ status: 'settled', profileId: PROFILE_ID }),
    ],
    [
      'settles signed out',
      () => Promise.resolve({ status: 'settled', profileId: undefined }),
    ],
    [
      'is discarded',
      () => Promise.resolve({ status: 'discarded', profileId: PROFILE_ID }),
    ],
    ['rejects', () => Promise.reject(new Error('session unavailable'))],
  ])('goes Home and drops the code when the read %s', async (_label, read) => {
    mockFetchReferralMe.mockImplementation(read);

    const store = renderStep();
    await flushPromises();

    expect(mockDispatchNavigation).toHaveBeenCalledTimes(1);
    expect(mockDispatchNavigation).toHaveBeenCalledWith(homeReset);
    expect(store.getState().rewardsMoney).toEqual(
      expect.objectContaining({
        pendingReferralCode: null,
        answeredReferralCode: REFERRAL_CODE,
      }),
    );
  });

  it('goes Home once the load budget runs out', () => {
    const store = renderStep();

    act(() => {
      jest.advanceTimersByTime(ONBOARDING_MONEY_REFERRAL_LOAD_BUDGET_MS - 1);
    });
    expect(mockDispatchNavigation).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(mockDispatchNavigation).toHaveBeenCalledWith(homeReset);
    expect(store.getState().rewardsMoney.pendingReferralCode).toBeNull();
  });

  it('keeps the loaded offer on screen past the load budget', () => {
    mockInviteState = { ...mockInviteState, isCopyPending: false };
    renderStep();

    act(() => {
      jest.advanceTimersByTime(ONBOARDING_MONEY_REFERRAL_LOAD_BUDGET_MS * 2);
    });

    expect(mockDispatchNavigation).not.toHaveBeenCalled();
  });

  it('goes Home when the device is offline while loading', () => {
    mockNetworkTier = 'NONE';

    renderStep();

    expect(mockDispatchNavigation).toHaveBeenCalledWith(homeReset);
  });

  it('does not treat an unknown network tier as offline', () => {
    mockNetworkTier = null;

    renderStep();

    expect(mockDispatchNavigation).not.toHaveBeenCalled();
  });

  it('keeps a loaded offer when the device goes offline', () => {
    mockNetworkTier = 'NONE';
    mockInviteState = { ...mockInviteState, isCopyPending: false };

    renderStep();

    expect(mockDispatchNavigation).not.toHaveBeenCalled();
  });

  it('accepts the code from Continue', () => {
    mockInviteState = {
      ...mockInviteState,
      isCopyPending: false,
      canAccept: true,
    };
    renderStep();

    fireEvent.press(
      screen.getByTestId(OnboardingMoneyReferralTestIds.CONTINUE_BUTTON),
    );

    expect(mockAccept).toHaveBeenCalledTimes(1);
  });

  it('declines and goes Home from Continue without referral', () => {
    const store = renderStep();

    fireEvent.press(
      screen.getByTestId(OnboardingMoneyReferralTestIds.SKIP_BUTTON),
    );

    expect(mockRespond).toHaveBeenCalledWith('declined');
    expect(mockDispatchNavigation).toHaveBeenCalledWith(homeReset);
    expect(store.getState().rewardsMoney.pendingReferralCode).toBeNull();
  });

  it('stays on the step when declining is refused mid-registration', () => {
    mockRespond.mockReturnValue(false);
    renderStep();

    fireEvent.press(
      screen.getByTestId(OnboardingMoneyReferralTestIds.SKIP_BUTTON),
    );

    expect(mockDispatchNavigation).not.toHaveBeenCalled();
  });

  it.each(['onAccepted', 'onAutoDismiss'] as const)(
    'goes Home once when the invite calls %s',
    (callback) => {
      renderStep();

      act(() => {
        mockInviteParams?.[callback]?.();
        mockInviteParams?.[callback]?.();
      });

      expect(mockDispatchNavigation).toHaveBeenCalledTimes(1);
      expect(mockDispatchNavigation).toHaveBeenCalledWith(homeReset);
    },
  );

  it('does not navigate when the read settles after the step unmounted', async () => {
    let settleRead: (value: unknown) => void = () => undefined;
    mockFetchReferralMe.mockReturnValue(
      new Promise((resolve) => {
        settleRead = resolve;
      }),
    );
    renderStep();

    screen.unmount();
    await act(async () => {
      settleRead({ status: 'settled', profileId: PROFILE_ID });
    });

    expect(mockDispatchNavigation).not.toHaveBeenCalled();
  });

  it('swallows the Android hardware back press', () => {
    const addListener = jest.spyOn(BackHandler, 'addEventListener');
    renderStep();

    const handler = addListener.mock.calls.find(
      ([eventName]) => eventName === 'hardwareBackPress',
    )?.[1];

    expect(handler?.({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(true);
    expect(mockDispatchNavigation).not.toHaveBeenCalled();
  });
});
