import { act, renderHook } from '@testing-library/react-hooks';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  setReferralMe,
  setReferralMeError,
  setReferralMeLoading,
} from '../../../../reducers/rewardsMoney';
import type { ReferralMeDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { useReferralMe, useSessionProfileId } from './useReferralMe';

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

const PROFILE_A = 'profile-a';
const PROFILE_B = 'profile-b';

const mockReferralMe: ReferralMeDto = {
  role: 'REFERRER',
  variant: 'REFERRER',
  user_type: 'KOL',
  status: 'ACTIVE',
  referral_code: {
    code: 'KOL1',
    kind: 'PRIMARY',
    status: 'ACTIVE',
    share_url: null,
  },
  referred_by: null,
  earn_rates: {
    revshare_rate_bps: 1000,
    cashback_rate_bps: null,
    revshare_earning_term_minutes: 525600,
    cashback_earning_term_minutes: null,
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

  // The focus effect intentionally does not return its promise (a returned
  // value would be treated as a cleanup), so drain the queue instead.
  const flushPromises = () =>
    new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

  const triggerFocus = async () => {
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    await act(async () => {
      focusCallback();
      await flushPromises();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
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

    it('clears the profile id when getSessionProfile throws', async () => {
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
        await result.current.fetchReferralMe();
      });

      expect(result.current.profileId).toBeUndefined();
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
      const none = {
        ...mockReferralMe,
        role: 'NONE',
        variant: 'NONE',
      } as const;
      const referee = {
        ...mockReferralMe,
        role: 'REFEREE',
        variant: 'REFEREE',
      } as const;
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

describe('useSessionProfileId', () => {
  const mockEngineCall = Engine.controllerMessenger.call as jest.Mock;

  const flushPromises = () =>
    new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves the session profile id', async () => {
    mockEngineCall.mockResolvedValue({ profileId: PROFILE_A });

    const { result } = renderHook(() => useSessionProfileId());
    await act(async () => {
      await flushPromises();
    });

    expect(result.current).toEqual({
      profileId: PROFILE_A,
      isResolved: true,
    });
    expect(mockEngineCall).toHaveBeenCalledWith(
      'AuthenticationController:getSessionProfile',
    );
  });

  it('reports itself unresolved until the session read comes back', async () => {
    let releaseProfile: () => void = () => undefined;
    mockEngineCall.mockReturnValue(
      new Promise((resolve) => {
        releaseProfile = () => resolve({ profileId: PROFILE_A });
      }),
    );

    const { result } = renderHook(() => useSessionProfileId());

    // A caller cannot tell "no profile" from "not read yet" without this, and
    // profile-keyed state is empty in both cases.
    expect(result.current).toEqual({
      profileId: undefined,
      isResolved: false,
    });

    await act(async () => {
      releaseProfile();
      await flushPromises();
    });

    expect(result.current).toEqual({
      profileId: PROFILE_A,
      isResolved: true,
    });
  });

  it('does not update after unmount while the session read is pending', async () => {
    let releaseProfile: () => void = () => undefined;
    mockEngineCall.mockReturnValue(
      new Promise((resolve) => {
        releaseProfile = () => resolve({ profileId: PROFILE_A });
      }),
    );

    const { result, unmount } = renderHook(() => useSessionProfileId());
    expect(result.current).toEqual({
      profileId: undefined,
      isResolved: false,
    });

    unmount();
    await act(async () => {
      releaseProfile();
      await flushPromises();
    });

    expect(result.current).toEqual({
      profileId: undefined,
      isResolved: false,
    });
  });

  it('does not read referral me', async () => {
    mockEngineCall.mockResolvedValue({ profileId: PROFILE_A });

    renderHook(() => useSessionProfileId());
    await act(async () => {
      await flushPromises();
    });

    expect(mockEngineCall).toHaveBeenCalledTimes(1);
    expect(mockEngineCall).not.toHaveBeenCalledWith(
      'RewardsMoneyController:getReferralMe',
      expect.anything(),
    );
  });

  it.each([
    ['there is no session', undefined],
    ['the session has no profile', {}],
  ])('resolves to no profile id when %s', async (_name, sessionProfile) => {
    mockEngineCall.mockResolvedValue(sessionProfile);

    const { result } = renderHook(() => useSessionProfileId());
    await act(async () => {
      await flushPromises();
    });

    expect(result.current).toEqual({
      profileId: undefined,
      isResolved: true,
    });
  });

  it('resolves to no profile id when the session read throws', async () => {
    mockEngineCall.mockRejectedValue(new Error('no session'));

    const { result } = renderHook(() => useSessionProfileId());
    await act(async () => {
      await flushPromises();
    });

    expect(result.current).toEqual({
      profileId: undefined,
      isResolved: true,
    });
  });
});
