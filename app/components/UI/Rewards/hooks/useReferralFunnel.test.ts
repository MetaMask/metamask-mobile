import { renderHook } from '@testing-library/react-hooks';
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
    // setReferralFunnel settles loading and clears error in the reducer.
    expect(mockDispatch).toHaveBeenLastCalledWith(
      setReferralFunnel({ profileId: PROFILE_A, data: mockFunnel }),
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

  it('keeps a previous error visible while the retry is in flight', async () => {
    mockEngineCall.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useReferralFunnel(PROFILE_A));
    mockDispatch.mockClear();
    result.current.fetchReferralFunnel({ forceFresh: true });
    await flushPromises();

    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralFunnelLoading({ profileId: PROFILE_A, loading: true }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setReferralFunnelError({ profileId: PROFILE_A, error: false }),
    );
  });

  it('ignores a stale success that resolves after a newer request', async () => {
    const staleFunnel = { enrolled: 1, earning_generating: 0 };
    let resolveStale: (value: typeof staleFunnel) => void = () => undefined;
    let resolveFresh: (value: typeof mockFunnel) => void = () => undefined;
    mockEngineCall
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveStale = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFresh = resolve;
        }),
      );

    const { result } = renderHook(() => useReferralFunnel(PROFILE_A));
    result.current.fetchReferralFunnel({ forceFresh: true });
    resolveFresh(mockFunnel);
    await flushPromises();
    resolveStale(staleFunnel);
    await flushPromises();

    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralFunnel({ profileId: PROFILE_A, data: mockFunnel }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setReferralFunnel({ profileId: PROFILE_A, data: staleFunnel }),
    );
  });

  it('ignores a stale failure that rejects after a newer success', async () => {
    let rejectStale: (reason: Error) => void = () => undefined;
    let resolveFresh: (value: typeof mockFunnel) => void = () => undefined;
    mockEngineCall
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectStale = reject;
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFresh = resolve;
        }),
      );

    const { result } = renderHook(() => useReferralFunnel(PROFILE_A));
    result.current.fetchReferralFunnel({ forceFresh: true });
    resolveFresh(mockFunnel);
    await flushPromises();
    rejectStale(new Error('network'));
    await flushPromises();

    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralFunnel({ profileId: PROFILE_A, data: mockFunnel }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setReferralFunnelError({ profileId: PROFILE_A, error: true }),
    );
  });

  it('drops a request from a previous mount once a remount starts a new one', async () => {
    const staleFunnel = { enrolled: 1, earning_generating: 0 };
    let resolveStale: (value: typeof staleFunnel) => void = () => undefined;
    mockEngineCall
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveStale = resolve;
        }),
      )
      .mockResolvedValueOnce(mockFunnel);

    const first = renderHook(() => useReferralFunnel(PROFILE_A));
    first.unmount();
    renderHook(() => useReferralFunnel(PROFILE_A));
    await flushPromises();
    resolveStale(staleFunnel);
    await flushPromises();

    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralFunnel({ profileId: PROFILE_A, data: mockFunnel }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setReferralFunnel({ profileId: PROFILE_A, data: staleFunnel }),
    );
  });
});
