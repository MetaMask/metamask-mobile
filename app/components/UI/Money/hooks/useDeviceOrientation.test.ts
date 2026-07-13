import { renderHook } from '@testing-library/react-native';
import {
  accelerationToTilt,
  useDeviceOrientation,
} from './useDeviceOrientation';

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
const mockSetUpdateIntervalForType = jest.fn();

jest.mock('react-native-sensors', () => ({
  accelerometer: {
    subscribe: (observer: {
      next: (value: { x: number; y: number; z: number }) => void;
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
const G = 9.81;

describe('accelerationToTilt', () => {
  it('is neutral (0) on both axes at the natural 45° holding angle', () => {
    // pitch 45°: y === hypot(x, z); roll 0: x === 0.
    const tilt = accelerationToTilt(0, 1, 1);
    expect(tilt.x).toBeCloseTo(0);
    expect(tilt.y).toBeCloseTo(0);
  });

  it('reads a negative pitch when the phone lies flat', () => {
    const tilt = accelerationToTilt(0, 0, G);
    expect(tilt.y).toBe(-1); // pitch 0 is well below the 45° neutral
    expect(tilt.x).toBeCloseTo(0);
  });

  it('reads a positive roll when tilted right and negative when tilted left', () => {
    expect(accelerationToTilt(1, 0, 1).x).toBeGreaterThan(0);
    expect(accelerationToTilt(-1, 0, 1).x).toBeLessThan(0);
  });

  it('clamps both axes to the [-1, 1] range', () => {
    const right = accelerationToTilt(G, 0, 0);
    expect(right.x).toBeLessThanOrEqual(1);
    expect(right.x).toBeGreaterThanOrEqual(-1);
    const upright = accelerationToTilt(0, G, 0);
    expect(upright.y).toBeLessThanOrEqual(1);
    expect(upright.y).toBeGreaterThanOrEqual(-1);
  });
});

describe('useDeviceOrientation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe });
    mockGetTotalMemorySync.mockReturnValue(FOUR_GB);
  });

  it('subscribes to the accelerometer when enabled', () => {
    renderHook(() => useDeviceOrientation(jest.fn(), { enabled: true }));

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('subscribes by default when no options are provided', () => {
    renderHook(() => useDeviceOrientation(jest.fn()));

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe when disabled', () => {
    renderHook(() => useDeviceOrientation(jest.fn(), { enabled: false }));

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('subscribes when enabled flips from false to true', () => {
    const { rerender } = renderHook(
      ({ enabled }) => useDeviceOrientation(jest.fn(), { enabled }),
      { initialProps: { enabled: false } },
    );

    expect(mockSubscribe).not.toHaveBeenCalled();

    rerender({ enabled: true });

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes when enabled flips from true to false', () => {
    const { rerender } = renderHook(
      ({ enabled }) => useDeviceOrientation(jest.fn(), { enabled }),
      { initialProps: { enabled: true } },
    );

    rerender({ enabled: false });

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('smooths accelerometer samples toward the target tilt', () => {
    const onOrientation = jest.fn();
    renderHook(() => useDeviceOrientation(onOrientation, { enabled: true }));

    const observer = mockSubscribe.mock.calls[0][0];
    // Flat phone: target y is -1. Feed repeatedly so the low-pass converges.
    for (let i = 0; i < 100; i++) {
      observer.next({ x: 0, y: 0, z: G });
    }

    const [x, y] =
      onOrientation.mock.calls[onOrientation.mock.calls.length - 1];
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(-1);
  });

  it('emits a value smaller than the target on the first sample (low-pass)', () => {
    const onOrientation = jest.fn();
    renderHook(() => useDeviceOrientation(onOrientation, { enabled: true }));

    const observer = mockSubscribe.mock.calls[0][0];
    observer.next({ x: 0, y: 0, z: G });

    const [, y] = onOrientation.mock.calls[0];
    expect(y).toBeLessThan(0);
    expect(y).toBeGreaterThan(-1); // not yet fully converged to -1
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() =>
      useDeviceOrientation(jest.fn(), { enabled: true }),
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('uses a 60Hz interval on a standard device', () => {
    mockGetTotalMemorySync.mockReturnValue(FOUR_GB);

    renderHook(() => useDeviceOrientation(jest.fn(), { enabled: true }));

    expect(mockSetUpdateIntervalForType).toHaveBeenCalledWith(
      'accelerometer',
      1000 / 60,
    );
  });

  it('uses a 30Hz interval on a low-end device', () => {
    mockGetTotalMemorySync.mockReturnValue(TWO_GB);

    renderHook(() => useDeviceOrientation(jest.fn(), { enabled: true }));

    expect(mockSetUpdateIntervalForType).toHaveBeenCalledWith(
      'accelerometer',
      1000 / 30,
    );
  });

  it('does not resubscribe when only the callback identity changes', () => {
    const { rerender } = renderHook<
      void,
      { cb: (x: number, y: number) => void }
    >(({ cb }) => useDeviceOrientation(cb, { enabled: true }), {
      initialProps: { cb: jest.fn() },
    });

    rerender({ cb: jest.fn() });

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('invokes the latest callback after it changes', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = renderHook(
      ({ cb }) => useDeviceOrientation(cb, { enabled: true }),
      { initialProps: { cb: first } },
    );

    rerender({ cb: second });

    const observer = mockSubscribe.mock.calls[0][0];
    observer.next({ x: 0, y: 0, z: G });

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('ignores sensor errors without throwing', () => {
    renderHook(() => useDeviceOrientation(jest.fn(), { enabled: true }));

    const observer = mockSubscribe.mock.calls[0][0];

    expect(() => observer.error()).not.toThrow();
  });
});
