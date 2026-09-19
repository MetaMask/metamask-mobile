import { createElement, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import rewardsMoneyReducer from '../../../../reducers/rewardsMoney';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services';
import type { ReferralMeDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import useRewardsToast, {
  type RewardsToastConfig,
  type RewardsToastOptions,
} from './useRewardsToast';
import {
  MAX_REFERRAL_ME_REFRESH_ATTEMPTS,
  useAcceptMoneyReferralCode,
} from './useAcceptMoneyReferralCode';

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
}));

jest.mock('./useRewardsToast', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const PROFILE_A = 'profile-a';
const PROFILE_B = 'profile-b';
const CODE = 'KOL1';
const INVITE_ACCEPTED_TOAST = 'You’re in';

const buildReferralMe = (
  localizedText: Partial<ReferralMeDto['localized_text']> = {
    inviteAcceptedToast: INVITE_ACCEPTED_TOAST,
  },
): ReferralMeDto => ({
  role: 'REFEREE',
  variant: 'REFEREE',
  user_type: 'REGULAR',
  status: 'ACTIVE',
  referral_code: null,
  referred_by: {
    code: CODE,
    earning_start: null,
    earning_end: null,
  },
  earn_rates: {
    revshare_rate_bps: null,
    cashback_rate_bps: 500,
    revshare_earning_term_minutes: null,
    cashback_earning_term_minutes: 43200,
  },
  localized_text: localizedText as ReferralMeDto['localized_text'],
  invite_hero: null,
});

describe('useAcceptMoneyReferralCode', () => {
  const mockEngineCall = Engine.controllerMessenger.call as jest.Mock;
  const mockUseNavigation = jest.mocked(useNavigation);
  const mockUseRewardsToast = jest.mocked(useRewardsToast);

  const mockGoBack = jest.fn();
  const mockNavigate = jest.fn();
  const mockShowToast = jest.fn();
  const mockErrorToast = jest.fn(
    (title: string) =>
      ({ kind: 'error', title }) as unknown as RewardsToastOptions,
  );
  const mockSuccessToast = jest.fn(
    (title: string) =>
      ({ kind: 'success', title }) as unknown as RewardsToastOptions,
  );

  const unusedToastVariant = jest.fn(() => ({}) as RewardsToastOptions);

  const renderAcceptHook = () => {
    const store = configureStore({
      reducer: { rewardsMoney: rewardsMoneyReducer },
    });
    const wrapper = ({ children }: { children?: ReactNode }) =>
      createElement(Provider, { store }, children);

    return {
      store,
      ...renderHook(() => useAcceptMoneyReferralCode(), { wrapper }),
    };
  };

  /**
   * Drives the messenger the way the real controllers do: a public validate,
   * a register that either resolves or throws, then the forceFresh read back.
   */
  const mockMessenger = ({
    validateSuccess = true,
    validateError,
    registerError,
    referralMe = buildReferralMe(),
    referralMeError,
    sessionProfileIds = [PROFILE_A],
  }: {
    validateSuccess?: boolean;
    validateError?: Error;
    registerError?: Error;
    referralMe?: ReferralMeDto;
    referralMeError?: Error;
    /** Consumed in order; the last value repeats once exhausted. */
    sessionProfileIds?: string[];
  } = {}) => {
    const remainingProfileIds = [...sessionProfileIds];
    let lastProfileId = sessionProfileIds[sessionProfileIds.length - 1];

    mockEngineCall.mockImplementation(async (action: string) => {
      switch (action) {
        case 'RewardsMoneyController:validateReferralCode':
          if (validateError) {
            throw validateError;
          }
          return { success: validateSuccess };
        case 'RewardsMoneyController:registerReferee':
          if (registerError) {
            throw registerError;
          }
          return undefined;
        case 'AuthenticationController:getSessionProfile':
          if (remainingProfileIds.length > 0) {
            lastProfileId = remainingProfileIds.shift() as string;
          }
          return { profileId: lastProfileId };
        case 'RewardsMoneyController:getReferralMe':
          if (referralMeError) {
            throw referralMeError;
          }
          return referralMe;
        default:
          return undefined;
      }
    });
  };

  const callsFor = (action: string) =>
    mockEngineCall.mock.calls.filter(([called]) => called === action);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      goBack: mockGoBack,
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);
    mockUseRewardsToast.mockReturnValue({
      showToast: mockShowToast,
      RewardsToastOptions: {
        success: mockSuccessToast,
        error: mockErrorToast,
        loading: unusedToastVariant,
        warning: unusedToastVariant,
        entriesClosed: unusedToastVariant,
        enableNotificationsNudge: unusedToastVariant,
        outcomeWinner: unusedToastVariant,
        outcomeNonWinner: unusedToastVariant,
      } as unknown as RewardsToastConfig,
    });
  });

  it('exposes the accept action and a settled loading state', () => {
    mockMessenger();

    const { result } = renderAcceptHook();

    expect(typeof result.current.acceptReferralCode).toBe('function');
    expect(result.current.isLoading).toBe(false);
  });

  describe('validation before registering', () => {
    it('does not register when the server rejects the code', async () => {
      mockMessenger({ validateSuccess: false });

      const { result } = renderAcceptHook();
      let accepted: boolean | undefined;
      await act(async () => {
        accepted = await result.current.acceptReferralCode(CODE);
      });

      expect(accepted).toBe(false);
      expect(callsFor('RewardsMoneyController:registerReferee')).toHaveLength(
        0,
      );
      expect(mockErrorToast).toHaveBeenCalledWith(
        strings('rewards.error_messages.invalid_referral_code'),
      );
      expect(mockShowToast).toHaveBeenCalledWith({
        kind: 'error',
        title: strings('rewards.error_messages.invalid_referral_code'),
      });
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not register when validation throws', async () => {
      mockMessenger({ validateError: new Error('Network error') });

      const { result } = renderAcceptHook();
      await act(async () => {
        await result.current.acceptReferralCode(CODE);
      });

      expect(callsFor('RewardsMoneyController:registerReferee')).toHaveLength(
        0,
      );
      expect(mockErrorToast).toHaveBeenCalledWith(
        strings('rewards.error_messages.something_went_wrong'),
      );
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('does not reach the backend at all for a malformed code', async () => {
      mockMessenger();

      const { result } = renderAcceptHook();
      await act(async () => {
        await result.current.acceptReferralCode('AB');
      });

      expect(
        callsFor('RewardsMoneyController:validateReferralCode'),
      ).toHaveLength(0);
      expect(callsFor('RewardsMoneyController:registerReferee')).toHaveLength(
        0,
      );
      expect(mockErrorToast).toHaveBeenCalledWith(
        strings('rewards.error_messages.invalid_referral_code'),
      );
    });
  });

  describe('successful registration', () => {
    it('registers the normalized code, refreshes referral me and dismisses', async () => {
      mockMessenger();

      const { result, store } = renderAcceptHook();
      let accepted: boolean | undefined;
      await act(async () => {
        accepted = await result.current.acceptReferralCode('  kol1 ');
      });

      expect(accepted).toBe(true);
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsMoneyController:registerReferee',
        { code: CODE },
      );
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsMoneyController:getReferralMe',
        { forceFresh: true },
      );
      expect(store.getState().rewardsMoney.referralMe[PROFILE_A].data).toEqual(
        buildReferralMe(),
      );
      expect(mockSuccessToast).toHaveBeenCalledWith(INVITE_ACCEPTED_TOAST);
      expect(mockShowToast).toHaveBeenCalledWith({
        kind: 'success',
        title: INVITE_ACCEPTED_TOAST,
      });
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('dismisses without a success toast when the copy has no accepted string', async () => {
      mockMessenger({ referralMe: buildReferralMe({}) });

      const { result } = renderAcceptHook();
      await act(async () => {
        await result.current.acceptReferralCode(CODE);
      });

      expect(mockSuccessToast).not.toHaveBeenCalled();
      expect(mockErrorToast).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('reports loading while the flow runs and settles it afterwards', async () => {
      let releaseRegister: () => void = () => undefined;
      mockEngineCall.mockImplementation(async (action: string) => {
        switch (action) {
          case 'RewardsMoneyController:validateReferralCode':
            return { success: true };
          case 'RewardsMoneyController:registerReferee':
            await new Promise<void>((resolve) => {
              releaseRegister = resolve;
            });
            return undefined;
          case 'AuthenticationController:getSessionProfile':
            return { profileId: PROFILE_A };
          case 'RewardsMoneyController:getReferralMe':
            return buildReferralMe();
          default:
            return undefined;
        }
      });

      const { result } = renderAcceptHook();
      let pending: Promise<boolean> | undefined;

      act(() => {
        pending = result.current.acceptReferralCode(CODE);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        releaseRegister();
        await pending;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('register refusals', () => {
    it.each([
      [
        422,
        'invalid code',
        'rewards.error_messages.invalid_referral_code' as const,
      ],
      [409, 'already referred', 'rewards.error_messages.already_referred'],
      [
        403,
        'You cannot use your own referral code',
        'rewards.error_messages.cannot_use_own_referral_code',
      ],
      [
        403,
        'KOLs cannot be referred',
        'rewards.error_messages.something_went_wrong',
      ],
      [500, 'boom', 'rewards.error_messages.something_went_wrong'],
    ])(
      'maps a %s with body "%s" to its own message and stays on the sheet',
      async (status, bodyText, expectedKey) => {
        mockMessenger({
          registerError: new RewardsMoneyHttpError(
            `Register referee failed: ${status}`,
            status,
            bodyText,
          ),
        });

        const { result } = renderAcceptHook();
        let accepted: boolean | undefined;
        await act(async () => {
          accepted = await result.current.acceptReferralCode(CODE);
        });

        expect(accepted).toBe(false);
        expect(mockErrorToast).toHaveBeenCalledWith(strings(expectedKey));
        expect(mockGoBack).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(callsFor('RewardsMoneyController:getReferralMe')).toHaveLength(
          0,
        );
      },
    );

    it('reports something went wrong when the Money feature is disabled', async () => {
      mockMessenger({
        registerError: new Error('Rewards Money is disabled'),
      });

      const { result } = renderAcceptHook();
      await act(async () => {
        await result.current.acceptReferralCode(CODE);
      });

      expect(mockErrorToast).toHaveBeenCalledWith(
        strings('rewards.error_messages.something_went_wrong'),
      );
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('refresh after a successful registration', () => {
    it('dismisses and reports a fetch error when the refresh fails', async () => {
      mockMessenger({ referralMeError: new Error('Network error') });

      const { result } = renderAcceptHook();
      let accepted: boolean | undefined;
      await act(async () => {
        accepted = await result.current.acceptReferralCode(CODE);
      });

      expect(accepted).toBe(true);
      expect(callsFor('RewardsMoneyController:registerReferee')).toHaveLength(
        1,
      );
      expect(mockErrorToast).toHaveBeenCalledWith(
        strings('rewards.referral_details_error.error_fetching_title'),
      );
      expect(mockSuccessToast).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('retries the refresh without registering again when the first read is discarded', async () => {
      // The session moves to another profile mid-read, so the first refresh is
      // discarded; the retry runs entirely under the current identity.
      mockMessenger({
        sessionProfileIds: [PROFILE_A, PROFILE_B, PROFILE_B, PROFILE_B],
      });

      const { result, store } = renderAcceptHook();
      let accepted: boolean | undefined;
      await act(async () => {
        accepted = await result.current.acceptReferralCode(CODE);
      });

      expect(accepted).toBe(true);
      expect(callsFor('RewardsMoneyController:registerReferee')).toHaveLength(
        1,
      );
      expect(callsFor('RewardsMoneyController:getReferralMe')).toHaveLength(2);
      expect(store.getState().rewardsMoney.referralMe[PROFILE_B].data).toEqual(
        buildReferralMe(),
      );
      expect(mockSuccessToast).toHaveBeenCalledWith(INVITE_ACCEPTED_TOAST);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('treats an identity that never settles as a refresh failure and does not register again', async () => {
      // A new profile on every read: no attempt can ever settle.
      let sessionCallCount = 0;
      mockEngineCall.mockImplementation(async (action: string) => {
        switch (action) {
          case 'RewardsMoneyController:validateReferralCode':
            return { success: true };
          case 'RewardsMoneyController:registerReferee':
            return undefined;
          case 'AuthenticationController:getSessionProfile':
            sessionCallCount += 1;
            return { profileId: `profile-${sessionCallCount}` };
          case 'RewardsMoneyController:getReferralMe':
            return buildReferralMe();
          default:
            return undefined;
        }
      });

      const { result } = renderAcceptHook();
      await act(async () => {
        await result.current.acceptReferralCode(CODE);
      });

      expect(callsFor('RewardsMoneyController:registerReferee')).toHaveLength(
        1,
      );
      expect(callsFor('RewardsMoneyController:getReferralMe')).toHaveLength(
        MAX_REFERRAL_ME_REFRESH_ATTEMPTS,
      );
      expect(mockErrorToast).toHaveBeenCalledWith(
        strings('rewards.referral_details_error.error_fetching_title'),
      );
      expect(mockSuccessToast).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('overlapping accepts', () => {
    it('ignores a second accept while the first is in flight', async () => {
      let releaseRegister: () => void = () => undefined;
      mockEngineCall.mockImplementation(async (action: string) => {
        switch (action) {
          case 'RewardsMoneyController:validateReferralCode':
            return { success: true };
          case 'RewardsMoneyController:registerReferee':
            await new Promise<void>((resolve) => {
              releaseRegister = resolve;
            });
            return undefined;
          case 'AuthenticationController:getSessionProfile':
            return { profileId: PROFILE_A };
          case 'RewardsMoneyController:getReferralMe':
            return buildReferralMe();
          default:
            return undefined;
        }
      });

      const { result } = renderAcceptHook();
      let first: Promise<boolean> | undefined;
      let second: Promise<boolean> | undefined;

      act(() => {
        first = result.current.acceptReferralCode(CODE);
        second = result.current.acceptReferralCode('OTHER');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(
        callsFor('RewardsMoneyController:validateReferralCode'),
      ).toHaveLength(1);
      expect(callsFor('RewardsMoneyController:registerReferee')).toHaveLength(
        1,
      );

      const ignored = await Promise.race([
        second,
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(true), 50);
        }),
      ]);
      expect(ignored).toBe(false);
      expect(mockGoBack).not.toHaveBeenCalled();

      await act(async () => {
        releaseRegister();
        await first;
      });

      expect(callsFor('RewardsMoneyController:registerReferee')).toHaveLength(
        1,
      );
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('unmount while an accept is in flight', () => {
    const mockDeferredRegister = () => {
      let releaseRegister: () => void = () => undefined;
      mockEngineCall.mockImplementation(async (action: string) => {
        switch (action) {
          case 'RewardsMoneyController:validateReferralCode':
            return { success: true };
          case 'RewardsMoneyController:registerReferee':
            await new Promise<void>((resolve) => {
              releaseRegister = resolve;
            });
            return undefined;
          case 'AuthenticationController:getSessionProfile':
            return { profileId: PROFILE_A };
          case 'RewardsMoneyController:getReferralMe':
            return buildReferralMe();
          default:
            return undefined;
        }
      });
      return {
        releaseRegister: () => releaseRegister(),
      };
    };

    const mockDeferredRefresh = () => {
      let releaseRefresh: () => void = () => undefined;
      mockEngineCall.mockImplementation(async (action: string) => {
        switch (action) {
          case 'RewardsMoneyController:validateReferralCode':
            return { success: true };
          case 'RewardsMoneyController:registerReferee':
            return undefined;
          case 'AuthenticationController:getSessionProfile':
            return { profileId: PROFILE_A };
          case 'RewardsMoneyController:getReferralMe':
            await new Promise<void>((resolve) => {
              releaseRefresh = resolve;
            });
            return buildReferralMe();
          default:
            return undefined;
        }
      });
      return {
        releaseRefresh: () => releaseRefresh(),
      };
    };

    it('does not navigate, toast or set state after unmount during register', async () => {
      const { releaseRegister } = mockDeferredRegister();
      const { result, unmount, store } = renderAcceptHook();
      let pending: Promise<boolean> | undefined;

      act(() => {
        pending = result.current.acceptReferralCode(CODE);
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(callsFor('RewardsMoneyController:registerReferee')).toHaveLength(
        1,
      );

      unmount();

      releaseRegister();
      await pending;

      expect(callsFor('RewardsMoneyController:registerReferee')).toHaveLength(
        1,
      );
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsMoneyController:getReferralMe',
        { forceFresh: true },
      );
      expect(store.getState().rewardsMoney.referralMe[PROFILE_A].data).toEqual(
        buildReferralMe(),
      );
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('does not navigate, toast or set state after unmount during refresh', async () => {
      const { releaseRefresh } = mockDeferredRefresh();
      const { result, unmount } = renderAcceptHook();
      let pending: Promise<boolean> | undefined;

      act(() => {
        pending = result.current.acceptReferralCode(CODE);
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(callsFor('RewardsMoneyController:registerReferee')).toHaveLength(
        1,
      );
      expect(callsFor('RewardsMoneyController:getReferralMe')).toHaveLength(1);

      unmount();

      releaseRefresh();
      await pending;

      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });
});
