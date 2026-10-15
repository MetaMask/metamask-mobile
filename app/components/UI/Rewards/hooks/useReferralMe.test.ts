import { act, renderHook } from '@testing-library/react-hooks';
import { captureException } from '@sentry/react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import {
  setReferralMe,
  setReferralMeError,
  setReferralMeLoading,
} from '../../../../reducers/rewardsMoney';
import type { ReferralMeDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { useReferralMe } from './useReferralMe';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

const PROFILE_A = 'profile-a';
const PROFILE_B = 'profile-b';

const mockReferralMe: ReferralMeDto = {
  roles: ['REFERRER'],
  ui_variant: 'REFERRER',
  user_type: 'KOL',
  status: 'ACTIVE',
  referral_code: {
    code: 'KOL1',
    kind: 'PRIMARY',
    status: 'ACTIVE',
    share_url: null,
  },
  referral_code_status: 'ACTIVE',
  referred_by: null,
  earn_rates: {
    cashback_rate_bps: null,
    cashback_earning_start: null,
    cashback_earning_end: null,
    revshare_rate_bps: 1000,
    revshare_earning_start: null,
    revshare_earning_end: null,
  },
  localized_text: {} as ReferralMeDto['localized_text'],
  invite_hero: null,
};

describe('useReferralMe', () => {
  const mockDispatch = jest.fn();
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.Mock;

  const mockMessenger = ({
    profileId = PROFILE_A as string | null,
    referralMe = mockReferralMe as ReferralMeDto | undefined,
    referralMeError,
  }: {
    profileId?: string | null;
    referralMe?: ReferralMeDto | undefined;
    referralMeError?: Error;
  } = {}) => {
    mockEngineCall.mockImplementation(async (action: string) => {
      if (action === 'AuthenticationController:getSessionProfile') {
        return profileId ? { profileId } : undefined;
      }
      if (action === 'RewardsMoneyController:getReferralMe') {
        if (referralMeError) {
          throw referralMeError;
        }
        return referralMe;
      }
      return undefined;
    });
  };

  // nextTick, not setTimeout: the busy-refetch test uses fake timers.
  const flushPromises = () => new Promise(process.nextTick);

  // useOneShotBusyRefetch registers first so arm knows the screen is focused;
  // this hook's fetch effect is last. Only the latest pair is run so an
  // overlapping second instance is not pulled in.
  const triggerFocus = async () => {
    const focusCallbacks = mockUseFocusEffect.mock.calls
      .slice(-2)
      .map((call) => call[0]);
    await act(async () => {
      for (const focusCallback of focusCallbacks) {
        focusCallback();
      }
      await flushPromises();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementation((array) => {
        if (array instanceof Uint32Array) {
          array[0] = 0;
        }
        return array;
      });
    mockUseDispatch.mockReturnValue(mockDispatch);
  });

  it('returns the fetch function and no profile id before the first fetch', () => {
    mockMessenger();

    const { result } = renderHook(() => useReferralMe({ fetchOnMount: false }));

    expect(result.current.profileId).toBeUndefined();
    expect(typeof result.current.fetchReferralMe).toBe('function');
  });

  it('fetches referral me on focus and stores it under the session profile id', async () => {
    mockMessenger();

    const { result } = renderHook(() => useReferralMe());
    await triggerFocus();

    expect(mockEngineCall).toHaveBeenCalledWith(
      'AuthenticationController:getSessionProfile',
    );
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getReferralMe',
      { forceFresh: undefined },
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralMeLoading({ profileId: PROFILE_A, loading: true }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralMeError({ profileId: PROFILE_A, error: false }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralMe({ profileId: PROFILE_A, data: mockReferralMe }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralMeLoading({ profileId: PROFILE_A, loading: false }),
    );
    expect(result.current.profileId).toBe(PROFILE_A);
  });

  it('sets error and settles loading to false when the fetch fails', async () => {
    mockMessenger({ referralMeError: new Error('Network error') });

    renderHook(() => useReferralMe());
    await triggerFocus();

    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralMeError({ profileId: PROFILE_A, error: true }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralMeLoading({ profileId: PROFILE_A, loading: false }),
    );
  });

  it('reports a short busy read only when the refetch fails', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    try {
      const busy = new RewardsMoneyHttpError('busy', 503, undefined, 2);
      mockMessenger({ referralMeError: busy });
      renderHook(() => useReferralMe());
      await triggerFocus();

      expect(captureException).not.toHaveBeenCalled();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });
      await act(async () => {
        await new Promise(process.nextTick);
      });

      expect(captureException).toHaveBeenCalledTimes(1);
      expect(captureException).toHaveBeenCalledWith(busy, {
        tags: {
          feature: 'rewards-money',
          context: 'referralMe.fetch_failed',
        },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('forwards forceFresh to the controller', async () => {
    mockMessenger();

    const { result } = renderHook(() => useReferralMe({ fetchOnMount: false }));
    await act(async () => {
      await result.current.fetchReferralMe({ forceFresh: true });
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getReferralMe',
      { forceFresh: true },
    );
  });

  it('keys writes by the profile id resolved for that fetch', async () => {
    mockMessenger({ profileId: PROFILE_A });

    const { result } = renderHook(() => useReferralMe({ fetchOnMount: false }));
    await act(async () => {
      await result.current.fetchReferralMe();
    });

    mockMessenger({ profileId: PROFILE_B });
    await act(async () => {
      await result.current.fetchReferralMe();
    });

    const writtenProfileIds = mockDispatch.mock.calls
      .map(([action]) => action.payload.profileId)
      .filter(
        (profileId: string, index: number, all: string[]) =>
          all.indexOf(profileId) === index,
      );
    expect(writtenProfileIds).toEqual([PROFILE_A, PROFILE_B]);
    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralMe({ profileId: PROFILE_B, data: mockReferralMe }),
    );
  });

  it('does not dispatch or fetch when there is no session profile', async () => {
    mockMessenger({ profileId: null });

    renderHook(() => useReferralMe());
    await triggerFocus();

    expect(mockEngineCall).not.toHaveBeenCalledWith(
      'RewardsMoneyController:getReferralMe',
      expect.anything(),
    );
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not fetch on mount when fetchOnMount is false', async () => {
    mockMessenger();

    renderHook(() => useReferralMe({ fetchOnMount: false }));
    await triggerFocus();

    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('prevents duplicate concurrent fetches', async () => {
    mockEngineCall.mockImplementation(async (action: string) => {
      if (action === 'AuthenticationController:getSessionProfile') {
        return { profileId: PROFILE_A };
      }
      return new Promise(() => {
        // never resolves
      });
    });

    const { result } = renderHook(() => useReferralMe({ fetchOnMount: false }));
    await act(async () => {
      result.current.fetchReferralMe();
      await flushPromises();
      result.current.fetchReferralMe();
      await flushPromises();
    });

    const getReferralMeCalls = mockEngineCall.mock.calls.filter(
      ([action]) => action === 'RewardsMoneyController:getReferralMe',
    );
    expect(getReferralMeCalls).toHaveLength(1);
  });

  describe('session identity', () => {
    it('clears the profile id when the session ends after a successful fetch', async () => {
      mockMessenger();
      const { result } = renderHook(() =>
        useReferralMe({ fetchOnMount: false }),
      );
      await act(async () => {
        await result.current.fetchReferralMe();
      });
      expect(result.current.profileId).toBe(PROFILE_A);

      mockMessenger({ profileId: null });
      await act(async () => {
        await result.current.fetchReferralMe();
      });

      expect(result.current.profileId).toBeUndefined();
    });

    it('keeps the profile id when getSessionProfile throws', async () => {
      mockMessenger();
      const { result } = renderHook(() =>
        useReferralMe({ fetchOnMount: false }),
      );
      await act(async () => {
        await result.current.fetchReferralMe();
      });

      mockEngineCall.mockImplementation(async (action: string) => {
        if (action === 'AuthenticationController:getSessionProfile') {
          throw new Error('Session unavailable');
        }
        return undefined;
      });
      await act(async () => {
        await expect(result.current.fetchReferralMe()).rejects.toThrow(
          'Session unavailable',
        );
      });

      expect(result.current.profileId).toBe(PROFILE_A);
      expect(mockDispatch).not.toHaveBeenCalledWith(
        setReferralMeError({ profileId: PROFILE_A, error: true }),
      );
    });

    it('does not treat a failed session recheck as a profile change', async () => {
      let sessionReads = 0;
      let releaseFetch: () => void = () => undefined;
      mockEngineCall.mockImplementation(async (action: string) => {
        if (action === 'AuthenticationController:getSessionProfile') {
          sessionReads += 1;
          if (sessionReads === 1) {
            return { profileId: PROFILE_A };
          }
          throw new Error('Session unavailable');
        }
        if (action === 'RewardsMoneyController:getReferralMe') {
          await new Promise<void>((resolve) => {
            releaseFetch = resolve;
          });
          return mockReferralMe;
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useReferralMe({ fetchOnMount: false }),
      );
      await act(async () => {
        const fetchPromise = result.current.fetchReferralMe();
        await flushPromises();
        releaseFetch();
        await expect(fetchPromise).rejects.toThrow(
          'Session profile unavailable',
        );
      });

      expect(result.current.profileId).toBe(PROFILE_A);
      expect(mockDispatch).not.toHaveBeenCalledWith(
        setReferralMe({ profileId: PROFILE_A, data: mockReferralMe }),
      );
      expect(mockDispatch).not.toHaveBeenCalledWith(
        setReferralMeError({ profileId: PROFILE_A, error: true }),
      );
    });

    it('discards a response fetched under a session that changed mid-request', async () => {
      let sessionProfileId = PROFILE_A;
      let releaseFetch: () => void = () => undefined;
      mockEngineCall.mockImplementation(async (action: string) => {
        if (action === 'AuthenticationController:getSessionProfile') {
          return { profileId: sessionProfileId };
        }
        if (action === 'RewardsMoneyController:getReferralMe') {
          await new Promise<void>((resolve) => {
            releaseFetch = resolve;
          });
          return mockReferralMe;
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useReferralMe({ fetchOnMount: false }),
      );
      let fetchResult:
        | Awaited<ReturnType<typeof result.current.fetchReferralMe>>
        | undefined;
      await act(async () => {
        const fetchPromise = result.current.fetchReferralMe();
        await flushPromises();
        sessionProfileId = PROFILE_B;
        releaseFetch();
        fetchResult = await fetchPromise;
      });

      expect(fetchResult).toEqual({
        status: 'discarded',
        profileId: PROFILE_B,
      });
      expect(mockDispatch).not.toHaveBeenCalledWith(
        setReferralMe({ profileId: PROFILE_A, data: mockReferralMe }),
      );
      expect(mockDispatch).not.toHaveBeenCalledWith(
        setReferralMe({ profileId: PROFILE_B, data: mockReferralMe }),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        setReferralMeLoading({ profileId: PROFILE_A, loading: false }),
      );
      expect(result.current.profileId).toBe(PROFILE_B);
    });

    it('discards a failure raised under a session that changed mid-request', async () => {
      let sessionProfileId = PROFILE_A;
      let failFetch: () => void = () => undefined;
      mockEngineCall.mockImplementation(async (action: string) => {
        if (action === 'AuthenticationController:getSessionProfile') {
          return { profileId: sessionProfileId };
        }
        if (action === 'RewardsMoneyController:getReferralMe') {
          await new Promise<void>((resolve) => {
            failFetch = resolve;
          });
          throw new Error('Network error');
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useReferralMe({ fetchOnMount: false }),
      );
      await act(async () => {
        result.current.fetchReferralMe();
        await flushPromises();
        sessionProfileId = PROFILE_B;
        failFetch();
        await flushPromises();
      });

      expect(mockDispatch).not.toHaveBeenCalledWith(
        setReferralMeError({ profileId: PROFILE_A, error: true }),
      );
      expect(mockDispatch).not.toHaveBeenCalledWith(
        setReferralMeError({ profileId: PROFILE_B, error: true }),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        setReferralMeLoading({ profileId: PROFILE_A, loading: false }),
      );
    });
  });

  describe('overlapping fetches', () => {
    const mockDeferredFirstFetch = () => {
      const referralMeParams: ({ forceFresh?: boolean } | undefined)[] = [];
      let releaseFirstFetch: () => void = () => undefined;

      mockEngineCall.mockImplementation(
        async (action: string, params?: { forceFresh?: boolean }) => {
          if (action === 'AuthenticationController:getSessionProfile') {
            return { profileId: PROFILE_A };
          }
          if (action === 'RewardsMoneyController:getReferralMe') {
            referralMeParams.push(params);
            if (referralMeParams.length === 1) {
              await new Promise<void>((resolve) => {
                releaseFirstFetch = resolve;
              });
            }
            return mockReferralMe;
          }
          return undefined;
        },
      );

      return {
        referralMeParams,
        releaseFirstFetch: () => releaseFirstFetch(),
      };
    };

    it('runs a forceFresh fetch that overlaps an in-flight normal fetch', async () => {
      const { referralMeParams, releaseFirstFetch } = mockDeferredFirstFetch();

      const { result } = renderHook(() =>
        useReferralMe({ fetchOnMount: false }),
      );
      await act(async () => {
        result.current.fetchReferralMe();
        await flushPromises();
        result.current.fetchReferralMe({ forceFresh: true });
        await flushPromises();
        releaseFirstFetch();
        await flushPromises();
      });

      expect(referralMeParams).toEqual([
        { forceFresh: undefined },
        { forceFresh: true },
      ]);
      expect(mockDispatch).toHaveBeenCalledWith(
        setReferralMe({ profileId: PROFILE_A, data: mockReferralMe }),
      );
    });

    it('resolves the awaited forceFresh call only after its own fetch ran', async () => {
      const { referralMeParams, releaseFirstFetch } = mockDeferredFirstFetch();

      const { result } = renderHook(() =>
        useReferralMe({ fetchOnMount: false }),
      );
      let forceFreshSettled = false;

      await act(async () => {
        result.current.fetchReferralMe();
        await flushPromises();
        result.current.fetchReferralMe({ forceFresh: true }).then(() => {
          forceFreshSettled = true;
        });
        await flushPromises();

        expect(forceFreshSettled).toBe(false);

        releaseFirstFetch();
        await flushPromises();
      });

      expect(forceFreshSettled).toBe(true);
      expect(referralMeParams).toHaveLength(2);
    });

    it('lets a later forceFresh from another hook instance win Redux', async () => {
      const requestResolvers: ((value: ReferralMeDto) => void)[] = [];
      mockEngineCall.mockImplementation(async (action: string) => {
        if (action === 'AuthenticationController:getSessionProfile') {
          return { profileId: PROFILE_A };
        }
        if (action === 'RewardsMoneyController:getReferralMe') {
          return new Promise<ReferralMeDto>((resolve) => {
            requestResolvers.push(resolve);
          });
        }
        return undefined;
      });
      const none: ReferralMeDto = {
        ...mockReferralMe,
        roles: [],
        ui_variant: 'NONE',
        referral_code_status: null,
      };
      const referee: ReferralMeDto = {
        ...mockReferralMe,
        roles: ['REFEREE'],
        ui_variant: 'REFEREE',
        referral_code_status: null,
      };
      const first = renderHook(() => useReferralMe({ fetchOnMount: false }));
      const second = renderHook(() => useReferralMe({ fetchOnMount: false }));

      let firstPromise:
        | ReturnType<typeof first.result.current.fetchReferralMe>
        | undefined;
      let secondPromise:
        | ReturnType<typeof second.result.current.fetchReferralMe>
        | undefined;
      await act(async () => {
        firstPromise = first.result.current.fetchReferralMe();
        await flushPromises();
        secondPromise = second.result.current.fetchReferralMe({
          forceFresh: true,
        });
        await flushPromises();
      });
      expect(requestResolvers).toHaveLength(2);

      await act(async () => {
        requestResolvers[1](referee);
        await secondPromise;
        requestResolvers[0](none);
        await firstPromise;
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        setReferralMe({ profileId: PROFILE_A, data: referee }),
      );
      expect(mockDispatch).not.toHaveBeenCalledWith(
        setReferralMe({ profileId: PROFILE_A, data: none }),
      );
      const settledLoadingActions = mockDispatch.mock.calls.filter(
        ([action]) =>
          action.type === setReferralMeLoading.type &&
          action.payload.profileId === PROFILE_A &&
          action.payload.loading === false,
      );
      expect(settledLoadingActions).toHaveLength(1);
      await expect(firstPromise).resolves.toEqual({
        status: 'discarded',
        profileId: PROFILE_A,
      });
    });
  });
});
