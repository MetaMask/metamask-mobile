import { act, renderHook } from '@testing-library/react-hooks';
import { captureException } from '@sentry/react-native';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  setEarningsSummary,
  setEarningsSummaryError,
  setEarningsSummaryLoading,
} from '../../../../reducers/rewardsMoney';
import type { EarningsSummaryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { useEarningsSummary } from './useEarningsSummary';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

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

const PROFILE_A = 'profile-a';

const mockSummary = {
  lifetime_total: '41750000',
  window: null,
  pending: '0',
  claimed: '0',
  voided: '0',
  pairing_pending: false,
  minimum_musd_base_units: '1000000',
  self_earned: {
    lifetime: '0',
    pending: '0',
    claimed: '0',
    voided: '0',
    by_claim_family: {},
  },
  earned_by_others: {
    lifetime: '41750000',
    pending: '0',
    claimed: '0',
    voided: '0',
    by_claim_family: {},
  },
} as EarningsSummaryDto;

describe('useEarningsSummary', () => {
  const mockDispatch = jest.fn();
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.Mock;

  // The focus effect does not return its promise (a returned value would be
  // treated as a cleanup), so drain the queue instead.
  const flushPromises = () => new Promise(process.nextTick);

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
    mockUseFocusEffect.mockImplementation((effect) => {
      effect();
    });
    mockEngineCall.mockResolvedValue(mockSummary);
  });

  it('fetches on focus and writes the summary under the profile it was asked for', async () => {
    renderHook(() => useEarningsSummary(PROFILE_A));
    await flushPromises();

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getEarningsSummary',
      { forceFresh: undefined },
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setEarningsSummary({ profileId: PROFILE_A, data: mockSummary }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setEarningsSummaryError({ profileId: PROFILE_A, error: false }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setEarningsSummaryLoading({ profileId: PROFILE_A, loading: false }),
    );
  });

  it('asks for the whole summary, so both heroes read one cached response', async () => {
    renderHook(() => useEarningsSummary(PROFILE_A));
    await flushPromises();

    expect(mockEngineCall).toHaveBeenCalledTimes(1);
    expect(mockEngineCall.mock.calls[0][1]).not.toHaveProperty('originTypes');
  });

  it('does not call the controller without a profile id', async () => {
    renderHook(() => useEarningsSummary(undefined));
    await flushPromises();

    expect(mockEngineCall).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not call the controller while disabled', async () => {
    const { result } = renderHook(() =>
      useEarningsSummary(PROFILE_A, { enabled: false }),
    );
    await flushPromises();

    await expect(
      result.current.fetchEarningsSummary({ forceFresh: true }),
    ).resolves.toBeUndefined();
    expect(mockEngineCall).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('records a failure as an error and settles loading', async () => {
    mockEngineCall.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useEarningsSummary(PROFILE_A));
    await flushPromises();
    await expect(
      result.current.fetchEarningsSummary({ forceFresh: true }),
    ).rejects.toThrow('network');

    expect(mockDispatch).toHaveBeenCalledWith(
      setEarningsSummaryError({ profileId: PROFILE_A, error: true }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setEarningsSummaryLoading({ profileId: PROFILE_A, loading: false }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setEarningsSummary({ profileId: PROFILE_A, data: mockSummary }),
    );
  });

  it('refetches once after Retry-After and does not schedule another', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    try {
      mockEngineCall.mockRejectedValue(
        new RewardsMoneyHttpError('busy', 503, undefined, 2),
      );

      renderHook(() => useEarningsSummary(PROFILE_A));
      await flushPromises();
      expect(mockEngineCall).toHaveBeenCalledTimes(1);

      mockEngineCall.mockResolvedValue(mockSummary);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });
      await flushPromises();

      expect(mockEngineCall).toHaveBeenCalledTimes(2);
      expect(mockEngineCall).toHaveBeenLastCalledWith(
        'RewardsMoneyController:getEarningsSummary',
        { forceFresh: true },
      );

      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });
      await flushPromises();
      expect(mockEngineCall).toHaveBeenCalledTimes(2);
      expect(captureException).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('reports a short busy read only when the refetch fails', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    try {
      const busy = new RewardsMoneyHttpError('busy', 503, undefined, 2);
      mockEngineCall.mockRejectedValue(busy);

      renderHook(() => useEarningsSummary(PROFILE_A));
      await flushPromises();

      expect(captureException).not.toHaveBeenCalled();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });
      await flushPromises();

      expect(captureException).toHaveBeenCalledTimes(1);
      expect(captureException).toHaveBeenCalledWith(busy, {
        tags: {
          feature: 'rewards-money',
          context: 'earningsSummary.fetch_failed',
        },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('reports one shared rejection once when two screens await it', async () => {
    const failure = new Error('network');
    mockEngineCall.mockRejectedValue(failure);

    renderHook(() => useEarningsSummary(PROFILE_A));
    renderHook(() => useEarningsSummary(PROFILE_A));
    await flushPromises();

    expect(mockEngineCall).toHaveBeenCalledTimes(2);
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('keeps a stored summary when a slower instance rejects', async () => {
    let resolveFast: (value: typeof mockSummary) => void = () => undefined;
    let rejectSlow: (error: Error) => void = () => undefined;
    mockEngineCall
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFast = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectSlow = reject;
        }),
      );

    renderHook(() => useEarningsSummary(PROFILE_A));
    renderHook(() => useEarningsSummary(PROFILE_A));

    expect(mockEngineCall).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveFast(mockSummary);
      await flushPromises();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setEarningsSummary({ profileId: PROFILE_A, data: mockSummary }),
    );

    await act(async () => {
      rejectSlow(new Error('slow'));
      await flushPromises();
    });

    expect(mockDispatch).not.toHaveBeenCalledWith(
      setEarningsSummaryError({ profileId: PROFILE_A, error: true }),
    );
  });

  it('records an error when a later refresh rejects', async () => {
    const { result } = renderHook(() => useEarningsSummary(PROFILE_A));
    await flushPromises();

    mockDispatch.mockClear();
    mockEngineCall.mockRejectedValueOnce(new Error('refresh down'));
    await act(async () => {
      await result.current
        .fetchEarningsSummary({ forceFresh: true })
        .catch(() => undefined);
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setEarningsSummaryError({ profileId: PROFILE_A, error: true }),
    );
  });

  it('shares an in-flight read with a later caller', async () => {
    let resolveInFlight: (value: typeof mockSummary) => void = () => undefined;
    mockEngineCall.mockReturnValue(
      new Promise((resolve) => {
        resolveInFlight = resolve;
      }),
    );

    const { result } = renderHook(() => useEarningsSummary(PROFILE_A));
    const pending = result.current.fetchEarningsSummary();

    expect(mockEngineCall).toHaveBeenCalledTimes(1);

    resolveInFlight(mockSummary);
    await expect(pending).resolves.toEqual(mockSummary);
    expect(mockEngineCall).toHaveBeenCalledTimes(1);
  });

  it('fetches fresh after an in-flight read instead of returning no summary', async () => {
    let resolveInFlight: (value: typeof mockSummary) => void = () => undefined;
    const fresh = { ...mockSummary, lifetime_total: '100' };
    mockEngineCall.mockReturnValue(
      new Promise((resolve) => {
        resolveInFlight = resolve;
      }),
    );

    const { result } = renderHook(() => useEarningsSummary(PROFILE_A));
    let refreshed: EarningsSummaryDto | undefined;
    const pending = result.current
      .fetchEarningsSummary({ forceFresh: true })
      .then((summary) => {
        refreshed = summary;
      });

    expect(mockEngineCall).toHaveBeenCalledTimes(1);
    expect(refreshed).toBeUndefined();

    mockEngineCall.mockResolvedValueOnce(fresh);
    resolveInFlight(mockSummary);
    await act(async () => {
      await pending;
    });

    expect(refreshed).toEqual(fresh);
    expect(mockEngineCall).toHaveBeenLastCalledWith(
      'RewardsMoneyController:getEarningsSummary',
      { forceFresh: true },
    );
  });

  it('passes forceFresh through to the controller', async () => {
    const { result } = renderHook(() => useEarningsSummary(PROFILE_A));
    await flushPromises();
    mockEngineCall.mockClear();

    await expect(
      result.current.fetchEarningsSummary({ forceFresh: true }),
    ).resolves.toBe(mockSummary);

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getEarningsSummary',
      { forceFresh: true },
    );
  });
});
