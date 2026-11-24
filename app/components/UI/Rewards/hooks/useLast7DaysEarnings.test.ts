import { act, renderHook } from '@testing-library/react-hooks';
import { captureException } from '@sentry/react-native';
import { useFocusEffect } from '@react-navigation/native';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import type { RootState } from '../../../../reducers';
import type { EarningsSummaryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  last7DaysUtcWindow,
  useLast7DaysEarnings,
} from './useLast7DaysEarnings';

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const PROFILE_A = 'profile-a';
const PROFILE_B = 'profile-b';

const mockSummary = {
  lifetime_total: '2000000',
  window: { from: '2026-09-22', to: '2026-09-28' },
  pending: '0',
  claimed: '0',
  forfeited: '0',
  pairing_pending: false,
  minimum_musd_base_units: '1000000',
  self_earned: {
    lifetime: '0',
    pending: '0',
    claimed: '0',
    forfeited: '0',
    by_claim_family: {},
  },
  earned_by_others: {
    lifetime: '2000000',
    pending: '0',
    claimed: '0',
    forfeited: '0',
    by_claim_family: {},
  },
} as EarningsSummaryDto;

describe('last7DaysUtcWindow', () => {
  it('is the seven UTC dates ending today', () => {
    expect(last7DaysUtcWindow(new Date('2026-09-28T15:00:00.000Z'))).toEqual({
      from: '2026-09-22',
      to: '2026-09-28',
    });
  });

  it('crosses a month boundary in UTC', () => {
    expect(last7DaysUtcWindow(new Date('2026-03-02T01:00:00.000Z'))).toEqual({
      from: '2026-02-24',
      to: '2026-03-02',
    });
  });
});

describe('useLast7DaysEarnings', () => {
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.Mock;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const flushPromises = () => new Promise(process.nextTick);
  const pendingFocusEffects: (() => void)[] = [];
  let focusEffect: (() => void) | undefined;

  function zeroJitter(): void {
    jest
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementation((array) => {
        if (array instanceof Uint32Array) {
          array[0] = 0;
        }
        return array;
      });
  }

  const stateWithCachedWindow = (
    profileId: string,
    payload: EarningsSummaryDto,
  ): RootState => {
    const { from, to } = last7DaysUtcWindow();
    return {
      engine: {
        backgroundState: {
          RewardsMoneyController: {
            earningsSummary: {
              [`${profileId}:all|window:${from}..${to}|claimable:0`]: {
                payload,
                lastFetched: Date.now(),
              },
            },
          },
        },
      },
    } as unknown as RootState;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    pendingFocusEffects.length = 0;
    focusEffect = () => {
      pendingFocusEffects.slice().forEach((effect) => {
        effect();
      });
    };
    mockUseFocusEffect.mockImplementation((effect) => {
      pendingFocusEffects.push(effect);
      // The busy refetch and the focus fetch each register one effect. A
      // later render replaces both, so a focus runs this render's pair.
      pendingFocusEffects.splice(
        0,
        Math.max(0, pendingFocusEffects.length - 2),
      );
    });
    mockUseSelector.mockReturnValue(null);
    mockEngineCall.mockResolvedValue(mockSummary);
  });

  it('shows the cached window on mount before the focus fetch lands', () => {
    const state = stateWithCachedWindow(PROFILE_A, mockSummary);
    mockUseSelector.mockImplementation((selector) => selector(state));

    const { result } = renderHook(() => useLast7DaysEarnings(PROFILE_A));

    expect(result.current.data).toEqual(mockSummary);
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('ignores a cached window that belongs to another profile', () => {
    const state = stateWithCachedWindow(PROFILE_B, mockSummary);
    mockUseSelector.mockImplementation((selector) => selector(state));

    const { result } = renderHook(() => useLast7DaysEarnings(PROFILE_A));

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('fetches a windowed summary with claimability off and keeps it out of Redux', async () => {
    const { result } = renderHook(() => useLast7DaysEarnings(PROFILE_A));
    await act(async () => {
      focusEffect?.();
      await flushPromises();
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getEarningsSummary',
      expect.objectContaining({
        from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        includeClaimable: false,
      }),
    );
    expect(result.current.data).toEqual(mockSummary);
    expect(result.current.error).toBe(false);
  });

  it('keeps the previous total when a refresh fails', async () => {
    const { result } = renderHook(() => useLast7DaysEarnings(PROFILE_A));
    await act(async () => {
      focusEffect?.();
      await flushPromises();
    });

    mockEngineCall.mockRejectedValueOnce(new Error('down'));
    await act(async () => {
      result.current.retry();
      await flushPromises();
    });

    expect(result.current.data).toEqual(mockSummary);
    expect(result.current.error).toBe(true);
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: {
        feature: 'rewards-money',
        context: 'last7DaysEarnings.fetch_failed',
      },
    });
    expect(mockEngineCall).toHaveBeenLastCalledWith(
      'RewardsMoneyController:getEarningsSummary',
      expect.objectContaining({ forceFresh: true, includeClaimable: false }),
    );
  });

  it('skips a second fetch while one is still in flight', async () => {
    let resolveInFlight: (value: typeof mockSummary) => void = () => undefined;
    mockEngineCall.mockReturnValue(
      new Promise((resolve) => {
        resolveInFlight = resolve;
      }),
    );

    const { result } = renderHook(() => useLast7DaysEarnings(PROFILE_A));
    await act(async () => {
      focusEffect?.();
    });
    await act(async () => {
      result.current.retry();
    });

    expect(mockEngineCall).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveInFlight(mockSummary);
      await flushPromises();
    });

    mockEngineCall.mockResolvedValue(mockSummary);
    await act(async () => {
      result.current.retry();
      await flushPromises();
    });

    expect(mockEngineCall).toHaveBeenCalledTimes(2);
  });

  it('drops the previous profile total and ignores its late response', async () => {
    let resolveProfileA: (value: typeof mockSummary) => void = () => undefined;
    mockEngineCall.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveProfileA = resolve;
      }),
    );
    const summaryB = { ...mockSummary, lifetime_total: '1000000' };
    mockEngineCall.mockResolvedValueOnce(summaryB);

    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useLast7DaysEarnings(id),
      { initialProps: { id: PROFILE_A } },
    );
    await act(async () => {
      focusEffect?.();
    });

    rerender({ id: PROFILE_B });

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      focusEffect?.();
      await flushPromises();
    });

    expect(mockEngineCall).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual(summaryB);

    await act(async () => {
      resolveProfileA(mockSummary);
      await flushPromises();
    });

    expect(result.current.data).toEqual(summaryB);
    expect(result.current.error).toBe(false);
  });

  it('drops the previous profile total when the next profile fetch fails', async () => {
    let resolveProfileA: (value: typeof mockSummary) => void = () => undefined;
    mockEngineCall.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveProfileA = resolve;
      }),
    );
    mockEngineCall.mockRejectedValueOnce(new Error('profile b down'));

    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useLast7DaysEarnings(id),
      { initialProps: { id: PROFILE_A } },
    );
    await act(async () => {
      focusEffect?.();
    });

    rerender({ id: PROFILE_B });

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      focusEffect?.();
      await flushPromises();
    });

    expect(mockEngineCall).toHaveBeenCalledTimes(2);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe(true);
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      resolveProfileA(mockSummary);
      await flushPromises();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe(true);
  });

  it('refetches once after Retry-After and does not schedule another', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    zeroJitter();
    try {
      mockEngineCall.mockRejectedValue(
        new RewardsMoneyHttpError('busy', 503, undefined, 2),
      );

      renderHook(() => useLast7DaysEarnings(PROFILE_A));
      await act(async () => {
        focusEffect?.();
        await flushPromises();
      });
      expect(mockEngineCall).toHaveBeenCalledTimes(1);
      expect(captureException).not.toHaveBeenCalled();

      mockEngineCall.mockResolvedValue(mockSummary);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });
      await flushPromises();

      expect(mockEngineCall).toHaveBeenCalledTimes(2);
      expect(mockEngineCall).toHaveBeenLastCalledWith(
        'RewardsMoneyController:getEarningsSummary',
        expect.objectContaining({ forceFresh: true, includeClaimable: false }),
      );

      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });
      await flushPromises();
      expect(mockEngineCall).toHaveBeenCalledTimes(2);
      expect(captureException).not.toHaveBeenCalled();
    } finally {
      jest.restoreAllMocks();
      jest.useRealTimers();
    }
  });

  it('reports a short busy read only when the refetch fails', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    zeroJitter();
    try {
      const busy = new RewardsMoneyHttpError('busy', 503, undefined, 2);
      mockEngineCall.mockRejectedValue(busy);

      renderHook(() => useLast7DaysEarnings(PROFILE_A));
      await act(async () => {
        focusEffect?.();
        await flushPromises();
      });

      expect(captureException).not.toHaveBeenCalled();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });
      await flushPromises();

      expect(captureException).toHaveBeenCalledTimes(1);
      expect(captureException).toHaveBeenCalledWith(busy, {
        tags: {
          feature: 'rewards-money',
          context: 'last7DaysEarnings.fetch_failed',
        },
      });
    } finally {
      jest.restoreAllMocks();
      jest.useRealTimers();
    }
  });
});
