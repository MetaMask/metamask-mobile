import { act, renderHook } from '@testing-library/react-hooks';
import { captureException } from '@sentry/react-native';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  setReferralFunnel,
  setReferralFunnelError,
  setReferralFunnelLoading,
} from '../../../../reducers/rewardsMoney';
import { useReferralFunnel } from './useReferralFunnel';

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
const mockFunnel = { enrolled: 12, earning_generating: 5 };

describe('useReferralFunnel', () => {
  const mockDispatch = jest.fn();
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.Mock;
  const flushPromises = () => new Promise(process.nextTick);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseFocusEffect.mockImplementation((effect) => {
      effect();
    });
    mockEngineCall.mockResolvedValue(mockFunnel);
  });

  it('fetches on focus and writes the funnel under the profile it was asked for', async () => {
    renderHook(() => useReferralFunnel(PROFILE_A));
    await flushPromises();

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getReferralFunnel',
      { forceFresh: undefined },
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralFunnelLoading({ profileId: PROFILE_A, loading: true }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setReferralFunnelError({ profileId: PROFILE_A, error: false }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralFunnel({ profileId: PROFILE_A, data: mockFunnel }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralFunnelLoading({ profileId: PROFILE_A, loading: false }),
    );
  });

  it('does not call the controller when disabled', async () => {
    renderHook(() => useReferralFunnel(PROFILE_A, { enabled: false }));
    await flushPromises();

    expect(mockEngineCall).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not call the controller without a profile id', async () => {
    renderHook(() => useReferralFunnel(undefined));
    await flushPromises();

    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('records a failure as an error and settles loading', async () => {
    mockEngineCall.mockRejectedValue(new Error('network'));

    renderHook(() => useReferralFunnel(PROFILE_A));
    await flushPromises();

    expect(mockDispatch).not.toHaveBeenCalledWith(
      setReferralFunnelError({ profileId: PROFILE_A, error: false }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralFunnelError({ profileId: PROFILE_A, error: true }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralFunnelLoading({ profileId: PROFILE_A, loading: false }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setReferralFunnel({ profileId: PROFILE_A, data: mockFunnel }),
    );
  });

  it('skips a second fetch while one is still in flight', async () => {
    let resolveInFlight: (value: typeof mockFunnel) => void = () => undefined;
    mockEngineCall.mockReturnValue(
      new Promise((resolve) => {
        resolveInFlight = resolve;
      }),
    );

    const { result } = renderHook(() => useReferralFunnel(PROFILE_A));
    result.current.fetchReferralFunnel({ forceFresh: true });

    expect(mockEngineCall).toHaveBeenCalledTimes(1);

    resolveInFlight(mockFunnel);
    await flushPromises();

    mockEngineCall.mockResolvedValue(mockFunnel);
    result.current.fetchReferralFunnel({ forceFresh: true });
    await flushPromises();

    expect(mockEngineCall).toHaveBeenCalledTimes(2);
  });

  it('refetches once after Retry-After and does not schedule another', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    jest
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementation((array) => {
        if (array instanceof Uint32Array) {
          array[0] = 0;
        }
        return array;
      });
    try {
      mockEngineCall.mockRejectedValue(
        new RewardsMoneyHttpError('busy', 503, undefined, 2),
      );

      renderHook(() => useReferralFunnel(PROFILE_A));
      await flushPromises();
      expect(mockEngineCall).toHaveBeenCalledTimes(1);

      mockEngineCall.mockResolvedValue(mockFunnel);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });
      await flushPromises();

      expect(mockEngineCall).toHaveBeenCalledTimes(2);
      expect(mockEngineCall).toHaveBeenLastCalledWith(
        'RewardsMoneyController:getReferralFunnel',
        { forceFresh: true },
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
    jest
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementation((array) => {
        if (array instanceof Uint32Array) {
          array[0] = 0;
        }
        return array;
      });
    try {
      const busy = new RewardsMoneyHttpError('busy', 503, undefined, 2);
      mockEngineCall.mockRejectedValue(busy);

      renderHook(() => useReferralFunnel(PROFILE_A));
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
          context: 'referralFunnel.fetch_failed',
        },
      });
    } finally {
      jest.restoreAllMocks();
      jest.useRealTimers();
    }
  });
});
