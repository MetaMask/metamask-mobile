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

  it('records a failure as an error and settles loading', async () => {
    mockEngineCall.mockRejectedValue(new Error('network'));

    renderHook(() => useEarningsSummary(PROFILE_A));
    await flushPromises();

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

  it('passes forceFresh through to the controller', async () => {
    const { result } = renderHook(() => useEarningsSummary(PROFILE_A));
    await flushPromises();
    mockEngineCall.mockClear();

    await result.current.fetchEarningsSummary({ forceFresh: true });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getEarningsSummary',
      { forceFresh: true },
    );
  });
});
