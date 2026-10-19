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

    expect(openSetupIfNeeded).toHaveBeenCalledWith(performFollow);
    expect(performFollow).toHaveBeenCalledTimes(1);
  });

  it('defers the follow to the setup sheet when setup is needed', async () => {
    const openSetupIfNeeded = setGate(true);
    const performFollow = jest.fn();

    const { result } = renderHook(() => useFollowWithNotificationSetup());
    await result.current.followWithSetup(false, performFollow);

    // Handed to the sheet, which performs it once a channel is enabled.
    expect(openSetupIfNeeded).toHaveBeenCalledWith(performFollow);
    expect(performFollow).not.toHaveBeenCalled();
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
