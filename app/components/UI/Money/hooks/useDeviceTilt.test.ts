import { renderHook } from '@testing-library/react-native';
import { useDeviceTilt } from './useDeviceTilt';

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
const mockSetUpdateIntervalForType = jest.fn();

jest.mock('react-native-sensors', () => ({
  accelerometer: {
    subscribe: (observer: {
      next: (value: { x: number; y: number }) => void;
      error: () => void;
    }) => mockSubscribe(observer),
  },
  SensorTypes: { accelerometer: 'accelerometer' },
  setUpdateIntervalForType: (...args: unknown[]) =>
    mockSetUpdateIntervalForType(...args),
}));

const mockGetTotalMemorySync = jest.fn();
jest.mock('react-native-device-info', () => ({
  getTotalMemorySync: () => mockGetTotalMemorySync(),
}));

const TWO_GB = 2 * 1024 * 1024 * 1024;
const FOUR_GB = 4 * 1024 * 1024 * 1024;

describe('useDeviceTilt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe });
    mockGetTotalMemorySync.mockReturnValue(FOUR_GB);
  });

  it('subscribes to the accelerometer when enabled', () => {
    renderHook(() => useDeviceTilt(jest.fn(), { enabled: true }));

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('subscribes by default when no options are provided', () => {
    renderHook(() => useDeviceTilt(jest.fn()));

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe when disabled', () => {
    renderHook(() => useDeviceTilt(jest.fn(), { enabled: false }));

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('subscribes when enabled flips from false to true', () => {
    const { rerender } = renderHook(
      ({ enabled }) => useDeviceTilt(jest.fn(), { enabled }),
      { initialProps: { enabled: false } },
    );

    expect(mockSubscribe).not.toHaveBeenCalled();

    rerender({ enabled: true });

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes when enabled flips from true to false', () => {
    const { rerender } = renderHook(
      ({ enabled }) => useDeviceTilt(jest.fn(), { enabled }),
      { initialProps: { enabled: true } },
    );

    rerender({ enabled: false });

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('forwards normalized and clamped values via onTilt', () => {
    const onTilt = jest.fn();
    renderHook(() => useDeviceTilt(onTilt, { enabled: true }));

    const observer = mockSubscribe.mock.calls[0][0];
    observer.next({ x: 9.81, y: -9.81 });

    expect(onTilt).toHaveBeenCalledTimes(1);
    const [x, y] = onTilt.mock.calls[0];
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThanOrEqual(1);
    expect(y).toBeLessThan(0);
    expect(y).toBeGreaterThanOrEqual(-1);
  });

  it('clamps values that exceed gravity to the [-1, 1] range', () => {
    const onTilt = jest.fn();
    renderHook(() => useDeviceTilt(onTilt, { enabled: true }));

    const observer = mockSubscribe.mock.calls[0][0];
    for (let i = 0; i < 100; i++) {
      observer.next({ x: 1000, y: -1000 });
    }

    const [x, y] = onTilt.mock.calls[onTilt.mock.calls.length - 1];
    expect(x).toBeLessThanOrEqual(1);
    expect(y).toBeGreaterThanOrEqual(-1);
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() =>
      useDeviceTilt(jest.fn(), { enabled: true }),
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('uses a 60Hz interval on a standard device', () => {
    mockGetTotalMemorySync.mockReturnValue(FOUR_GB);

    renderHook(() => useDeviceTilt(jest.fn(), { enabled: true }));

    expect(mockSetUpdateIntervalForType).toHaveBeenCalledWith(
      'accelerometer',
      1000 / 60,
    );
  });

  it('uses a 30Hz interval on a low-end device', () => {
    mockGetTotalMemorySync.mockReturnValue(TWO_GB);

    renderHook(() => useDeviceTilt(jest.fn(), { enabled: true }));

    expect(mockSetUpdateIntervalForType).toHaveBeenCalledWith(
      'accelerometer',
      1000 / 30,
    );
  });

  it('does not resubscribe when only the callback identity changes', () => {
    const { rerender } = renderHook<
      void,
      { cb: (x: number, y: number) => void }
    >(({ cb }) => useDeviceTilt(cb, { enabled: true }), {
      initialProps: { cb: jest.fn() },
    });

    rerender({ cb: jest.fn() });

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('invokes the latest callback after it changes', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = renderHook(
      ({ cb }) => useDeviceTilt(cb, { enabled: true }),
      { initialProps: { cb: first } },
    );

    rerender({ cb: second });

    const observer = mockSubscribe.mock.calls[0][0];
    observer.next({ x: 1, y: 1 });

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('ignores sensor errors without throwing', () => {
    renderHook(() => useDeviceTilt(jest.fn(), { enabled: true }));

    const observer = mockSubscribe.mock.calls[0][0];

    expect(() => observer.error()).not.toThrow();
  });
});
