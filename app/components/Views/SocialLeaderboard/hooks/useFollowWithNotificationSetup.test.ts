import { renderHook } from '@testing-library/react-native';
import { useFollowWithNotificationSetup } from './useFollowWithNotificationSetup';
import { useOpenTradingSignalsSetup } from './useOpenTradingSignalsSetup';

jest.mock('./useOpenTradingSignalsSetup');

const mockUseOpenTradingSignalsSetup =
  useOpenTradingSignalsSetup as jest.MockedFunction<
    typeof useOpenTradingSignalsSetup
  >;

/** @param intercepts - What `openSetupIfNeeded` returns (true = setup opened). */
const setGate = (intercepts: boolean) => {
  const openSetupIfNeeded = jest.fn(() => intercepts);
  mockUseOpenTradingSignalsSetup.mockReturnValue({ openSetupIfNeeded });
  return openSetupIfNeeded;
};

describe('useFollowWithNotificationSetup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('follows directly when setup is not needed', async () => {
    const openSetupIfNeeded = setGate(false);
    const performFollow = jest.fn();

    const { result } = renderHook(() => useFollowWithNotificationSetup());
    await result.current.followWithSetup(false, performFollow);

    expect(performFollow).toHaveBeenCalledTimes(1);
    expect(openSetupIfNeeded).toHaveBeenCalledWith();
  });

  it('follows before opening notification setup', async () => {
    const openSetupIfNeeded = setGate(true);
    const calls: string[] = [];
    const performFollow = jest.fn(async () => {
      calls.push('follow');
    });
    openSetupIfNeeded.mockImplementation(() => {
      calls.push('setup');
      return true;
    });

    const { result } = renderHook(() => useFollowWithNotificationSetup());
    await result.current.followWithSetup(false, performFollow);

    expect(calls).toEqual(['follow', 'setup']);
    expect(openSetupIfNeeded).toHaveBeenCalledWith();
  });

  it('skips notification setup when the follow rejects', async () => {
    const openSetupIfNeeded = setGate(true);
    const performFollow = jest.fn().mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useFollowWithNotificationSetup());

    await expect(
      result.current.followWithSetup(false, performFollow),
    ).rejects.toThrow('fail');

    expect(openSetupIfNeeded).not.toHaveBeenCalled();
  });

  it('never gates an unfollow, even when setup would be needed', async () => {
    const openSetupIfNeeded = setGate(true);
    const performFollow = jest.fn();

    const { result } = renderHook(() => useFollowWithNotificationSetup());
    await result.current.followWithSetup(true, performFollow);

    expect(openSetupIfNeeded).not.toHaveBeenCalled();
    expect(performFollow).toHaveBeenCalledTimes(1);
  });

  it('awaits an async follow', async () => {
    setGate(false);
    let settled = false;
    const performFollow = jest.fn(async () => {
      await Promise.resolve();
      settled = true;
    });

    const { result } = renderHook(() => useFollowWithNotificationSetup());
    await result.current.followWithSetup(false, performFollow);

    expect(settled).toBe(true);
  });
});
