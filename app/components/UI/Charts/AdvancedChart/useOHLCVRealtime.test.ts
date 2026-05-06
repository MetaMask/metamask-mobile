import { act, renderHook } from '@testing-library/react-native';
import { useOHLCVRealtime } from './useOHLCVRealtime';

const mockCall = jest.fn().mockResolvedValue(undefined);
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
      subscribe: (...args: unknown[]) => mockSubscribe(...args),
      unsubscribe: (...args: unknown[]) => mockUnsubscribe(...args),
    },
  },
}));

function arrangeDefaultOptions() {
  return {
    assetId: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    interval: '15m',
    currency: 'usd',
    enabled: true,
  };
}

describe('useOHLCVRealtime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockCall.mockReset().mockResolvedValue(undefined);
    mockSubscribe.mockReset();
    mockUnsubscribe.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('subscribes to barUpdated and subscriptionError events immediately', () => {
    renderHook(() => useOHLCVRealtime(arrangeDefaultOptions()));

    expect(mockSubscribe).toHaveBeenCalledWith(
      'OHLCVService:barUpdated',
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalledWith(
      'OHLCVService:subscriptionError',
      expect.any(Function),
    );
  });

  it('does not call OHLCVService:subscribe before debounce period', () => {
    renderHook(() => useOHLCVRealtime(arrangeDefaultOptions()));

    expect(mockCall).not.toHaveBeenCalledWith(
      'OHLCVService:subscribe',
      expect.anything(),
    );
  });

  it('calls OHLCVService:subscribe after 300ms debounce', async () => {
    renderHook(() => useOHLCVRealtime(arrangeDefaultOptions()));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockCall).toHaveBeenCalledWith('OHLCVService:subscribe', {
      assetId: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      interval: '15m',
      currency: 'usd',
    });
  });

  it('does not subscribe when enabled is false', async () => {
    renderHook(() =>
      useOHLCVRealtime({ ...arrangeDefaultOptions(), enabled: false }),
    );

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('does not subscribe when assetId is empty', async () => {
    renderHook(() =>
      useOHLCVRealtime({ ...arrangeDefaultOptions(), assetId: '' }),
    );

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('unsubscribes from events and calls OHLCVService:unsubscribe on unmount', async () => {
    const { unmount } = renderHook(() =>
      useOHLCVRealtime(arrangeDefaultOptions()),
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'OHLCVService:barUpdated',
      expect.any(Function),
    );
    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'OHLCVService:subscriptionError',
      expect.any(Function),
    );
    expect(mockCall).toHaveBeenCalledWith('OHLCVService:unsubscribe', {
      assetId: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      interval: '15m',
      currency: 'usd',
    });
  });

  it('does not call OHLCVService:unsubscribe on unmount if debounce did not fire', () => {
    const { unmount } = renderHook(() =>
      useOHLCVRealtime(arrangeDefaultOptions()),
    );

    unmount();

    expect(mockCall).not.toHaveBeenCalledWith(
      'OHLCVService:unsubscribe',
      expect.anything(),
    );
  });

  it('sets latestBar when barUpdated event matches channel', async () => {
    const { result } = renderHook(() =>
      useOHLCVRealtime(arrangeDefaultOptions()),
    );

    expect(result.current.latestBar).toBeNull();

    const barUpdatedHandler = mockSubscribe.mock.calls.find(
      (call) => call[0] === 'OHLCVService:barUpdated',
    )?.[1];

    const bar = {
      timestamp: 1700000000,
      open: 100,
      high: 105,
      low: 99,
      close: 103,
      volume: 5000,
    };

    await act(async () => {
      barUpdatedHandler({
        channel:
          'market-data.v1.eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913.15m.usd',
        bar,
      });
    });

    expect(result.current.latestBar).toEqual(bar);
  });

  it('ignores barUpdated events for different channels', async () => {
    const { result } = renderHook(() =>
      useOHLCVRealtime(arrangeDefaultOptions()),
    );

    const barUpdatedHandler = mockSubscribe.mock.calls.find(
      (call) => call[0] === 'OHLCVService:barUpdated',
    )?.[1];

    await act(async () => {
      barUpdatedHandler({
        channel: 'market-data.v1.eip155:1/slip44:60.15m.usd',
        bar: {
          timestamp: 1700000000,
          open: 100,
          high: 105,
          low: 99,
          close: 103,
          volume: 5000,
        },
      });
    });

    expect(result.current.latestBar).toBeNull();
  });

  it('resets latestBar to null when options change', async () => {
    const { result, rerender } = renderHook(
      (props) => useOHLCVRealtime(props),
      { initialProps: arrangeDefaultOptions() },
    );

    const barUpdatedHandler = mockSubscribe.mock.calls.find(
      (call) => call[0] === 'OHLCVService:barUpdated',
    )?.[1];

    await act(async () => {
      barUpdatedHandler({
        channel:
          'market-data.v1.eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913.15m.usd',
        bar: {
          timestamp: 1700000000,
          open: 100,
          high: 105,
          low: 99,
          close: 103,
          volume: 5000,
        },
      });
    });

    expect(result.current.latestBar).not.toBeNull();

    rerender({ ...arrangeDefaultOptions(), interval: '1h' });

    expect(result.current.latestBar).toBeNull();
  });
});
