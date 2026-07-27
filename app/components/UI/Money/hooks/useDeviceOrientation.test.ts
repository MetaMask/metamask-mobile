import { renderHook } from '@testing-library/react-native';
import {
  accelerationToPitch,
  accelerationToRoll,
  accelerationToTilt,
  trackNeutralPitch,
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
const DEG = Math.PI / 180;

/** Gravity vector for a device pitched `degrees` back from horizontal. */
const gravityAtPitch = (degrees: number) => ({
  x: 0,
  y: G * Math.sin(degrees * DEG),
  z: G * Math.cos(degrees * DEG),
});

/** Gravity vector for a device rolled `degrees` around its long axis. */
const gravityAtRoll = (degrees: number) => ({
  x: G * Math.sin(degrees * DEG),
  y: 0,
  z: G * Math.cos(degrees * DEG),
});

/**
 * Gravity vector for a device pitched `thetaDegrees` back from horizontal and
 * rolled `phiDegrees` around its long axis — i.e. a real holding posture.
 */
const gravityAtPitchAndRoll = (thetaDegrees: number, phiDegrees: number) => ({
  x: G * Math.cos(thetaDegrees * DEG) * Math.sin(phiDegrees * DEG),
  y: G * Math.sin(thetaDegrees * DEG),
  z: G * Math.cos(thetaDegrees * DEG) * Math.cos(phiDegrees * DEG),
});

const rollAt = (thetaDegrees: number, phiDegrees: number) => {
  const { x, y, z } = gravityAtPitchAndRoll(thetaDegrees, phiDegrees);
  return accelerationToRoll(x, y, z);
};

const tiltAt = (pitchDegrees: number, neutralDegrees: number) => {
  const { x, y, z } = gravityAtPitch(pitchDegrees);
  return accelerationToTilt(x, y, z, neutralDegrees * DEG);
};

describe('accelerationToPitch', () => {
  it('returns 0 for a device lying flat', () => {
    const { x, y, z } = gravityAtPitch(0);

    const pitch = accelerationToPitch(x, y, z);

    expect(pitch).toBeCloseTo(0);
  });

  it('returns a quarter turn for a device held upright', () => {
    const pitch = accelerationToPitch(0, G, 0);

    expect(pitch).toBeCloseTo(Math.PI / 2);
  });

  it('returns an eighth turn when the vertical component equals the horizontal magnitude', () => {
    // hypot(3, 4) === 5, so y === hypot(x, z).
    const pitch = accelerationToPitch(3, 5, 4);

    expect(pitch).toBeCloseTo(Math.PI / 4);
  });
});

describe('accelerationToRoll', () => {
  it.each([-45, -15, 0, 15, 45])(
    'matches the uncorrected roll for a flat device rolled %s degrees',
    (phiDegrees) => {
      const { x, y, z } = gravityAtPitchAndRoll(0, phiDegrees);

      const roll = accelerationToRoll(x, y, z);

      expect(roll).toBeCloseTo(Math.atan2(x, Math.hypot(y, z)));
    },
  );

  // The MUSD-1203 regression guard. Measured against the horizontal plane, a
  // roll scales with cos(pitch), so at a normal reading angle the uncorrected
  // atan2(x, hypot(y, z)) recovered only 0.69 / 0.48 / 0.25 of a real 30 degree
  // roll at 45 / 60 / 75 degrees of pitch — the parallax read as unresponsive.
  it.each([45, 60, 75])(
    'recovers at least 90 percent of a 30 degree roll at a holding pitch of %s degrees',
    (thetaDegrees) => {
      const roll = rollAt(thetaDegrees, 30);

      expect(Math.abs(roll) / (30 * DEG)).toBeGreaterThanOrEqual(0.9);
    },
  );

  it('reports approximately the same roll across holding pitches', () => {
    // Observed spread across these pitches is under 1.3 degrees.
    const flat = rollAt(0, 30);

    expect(rollAt(45, 30)).toBeCloseTo(flat, 1);
    expect(rollAt(60, 30)).toBeCloseTo(flat, 1);
    expect(rollAt(75, 30)).toBeCloseTo(flat, 1);
  });

  it('preserves the roll direction at a non-zero holding pitch', () => {
    expect(rollAt(60, 20)).toBeGreaterThan(0);
    expect(rollAt(60, -20)).toBeLessThan(0);
  });

  it('reports no roll for a device held vertical', () => {
    const roll = rollAt(90, 30);

    expect(roll).toBeCloseTo(0);
  });

  it('degrades gradually rather than jumping as the device approaches vertical', () => {
    const { x, y, z } = gravityAtPitchAndRoll(85, 30);
    const unflooredGain = Math.hypot(x, z) / Math.hypot(x, y, z);
    const unfloored = Math.atan2(x, Math.hypot(y, z)) / unflooredGain;

    const roll = accelerationToRoll(x, y, z);

    expect(Number.isFinite(roll)).toBe(true);
    expect(Math.abs(roll)).toBeGreaterThan(0);
    // The gain floor is engaging, so the roll falls short of its full travel
    // instead of being amplified without bound.
    expect(Math.abs(roll)).toBeLessThan(30 * DEG);
    expect(Math.abs(roll)).toBeLessThanOrEqual(Math.abs(unfloored));
  });

  it('returns 0 rather than NaN for a zero vector', () => {
    const roll = accelerationToRoll(0, 0, 0);

    expect(roll).toBe(0);
  });
});

describe('accelerationToTilt', () => {
  it.each([-30, 0, 20, 45, 70])(
    'reports no pitch offset when the reading matches a neutral of %s degrees',
    (neutralDegrees) => {
      const tilt = tiltAt(neutralDegrees, neutralDegrees);

      expect(tilt.y).toBeCloseTo(0);
    },
  );

  it('reports a positive pitch offset when pitched above the neutral', () => {
    const tilt = tiltAt(55, 45);

    expect(tilt.y).toBeCloseTo(10 / 30);
  });

  it('reports a negative pitch offset when pitched below the neutral', () => {
    const tilt = tiltAt(35, 45);

    expect(tilt.y).toBeCloseTo(-10 / 30);
  });

  it('clamps the pitch offset to 1 far above the neutral', () => {
    const tilt = tiltAt(90, 0);

    expect(tilt.y).toBe(1);
  });

  it('clamps the pitch offset to -1 far below the neutral', () => {
    const tilt = tiltAt(0, 90);

    expect(tilt.y).toBe(-1);
  });

  it('reports a positive roll when tilted right', () => {
    const { x, y, z } = gravityAtRoll(15);

    const tilt = accelerationToTilt(x, y, z, 0);

    expect(tilt.x).toBeCloseTo(15 / 30);
  });

  it('reports a negative roll when tilted left', () => {
    const { x, y, z } = gravityAtRoll(-15);

    const tilt = accelerationToTilt(x, y, z, 0);

    expect(tilt.x).toBeCloseTo(-15 / 30);
  });

  it('clamps the roll to the [-1, 1] range beyond the travel', () => {
    const right = gravityAtRoll(75);
    const left = gravityAtRoll(-75);

    expect(accelerationToTilt(right.x, right.y, right.z, 0).x).toBe(1);
    expect(accelerationToTilt(left.x, left.y, left.z, 0).x).toBe(-1);
  });

  it('reports a near-full roll for a 30 degree roll at a 75 degree holding pitch', () => {
    const right = gravityAtPitchAndRoll(75, 30);
    const left = gravityAtPitchAndRoll(75, -30);

    expect(accelerationToTilt(right.x, right.y, right.z, 0).x).toBeGreaterThan(
      0.9,
    );
    expect(accelerationToTilt(left.x, left.y, left.z, 0).x).toBeLessThan(-0.9);
  });

  it('leaves the roll unchanged when the neutral pitch changes', () => {
    const { x, y, z } = gravityAtRoll(15);

    const atZeroNeutral = accelerationToTilt(x, y, z, 0);
    const atUprightNeutral = accelerationToTilt(x, y, z, 90 * DEG);

    expect(atUprightNeutral.x).toBe(atZeroNeutral.x);
  });
});

describe('trackNeutralPitch', () => {
  it('adopts the measured pitch when there is no neutral yet', () => {
    const pitch = 0.42;

    const neutral = trackNeutralPitch(null, pitch, 60);

    expect(neutral).toBe(pitch);
  });

  it('moves a small fraction of the way from the neutral towards the pitch', () => {
    const neutral = trackNeutralPitch(0, 1, 60);

    expect(neutral).toBeGreaterThan(0);
    expect(neutral).toBeLessThan(1);
    expect(neutral).toBeLessThan(0.05);
  });

  it('advances the same amount at 30Hz over two samples as at 60Hz over four', () => {
    let atThirtyHz = 0;
    let atSixtyHz = 0;

    for (let i = 0; i < 2; i++)
      atThirtyHz = trackNeutralPitch(atThirtyHz, 1, 30);
    for (let i = 0; i < 4; i++) atSixtyHz = trackNeutralPitch(atSixtyHz, 1, 60);

    expect(atThirtyHz).toBeCloseTo(atSixtyHz, 3);
  });

  it('converges on the pitch when applied repeatedly', () => {
    let neutral = 0;

    for (let i = 0; i < 5000; i++) neutral = trackNeutralPitch(neutral, 1, 60);

    expect(neutral).toBeCloseTo(1, 5);
  });
});

describe('useDeviceOrientation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe });
    mockGetTotalMemorySync.mockReturnValue(FOUR_GB);
  });

  const lastEmission = (onOrientation: jest.Mock): [number, number] =>
    onOrientation.mock.calls[onOrientation.mock.calls.length - 1] as [
      number,
      number,
    ];

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

  it('emits a centred tilt for an unchanging upright reading', () => {
    const onOrientation = jest.fn();
    renderHook(() => useDeviceOrientation(onOrientation, { enabled: true }));
    const observer = mockSubscribe.mock.calls[0][0];
    const upright = gravityAtPitch(90);

    for (let i = 0; i < 100; i++) observer.next(upright);

    const [x, y] = lastEmission(onOrientation);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
  });

  it('emits a positive pitch once the device tilts up from its reference orientation', () => {
    const onOrientation = jest.fn();
    renderHook(() => useDeviceOrientation(onOrientation, { enabled: true }));
    const observer = mockSubscribe.mock.calls[0][0];
    const tiltedUp = gravityAtPitch(45);

    observer.next(gravityAtPitch(0));
    for (let i = 0; i < 50; i++) observer.next(tiltedUp);

    const [, y] = lastEmission(onOrientation);
    expect(y).toBeGreaterThan(0.9);
  });

  it('emits a negative pitch once the device tilts down from its reference orientation', () => {
    const onOrientation = jest.fn();
    renderHook(() => useDeviceOrientation(onOrientation, { enabled: true }));
    const observer = mockSubscribe.mock.calls[0][0];
    const tiltedDown = gravityAtPitch(0);

    observer.next(gravityAtPitch(45));
    for (let i = 0; i < 50; i++) observer.next(tiltedDown);

    const [, y] = lastEmission(onOrientation);
    expect(y).toBeLessThan(-0.9);
  });

  it('emits a smaller magnitude on the first sample after a tilt than once converged', () => {
    const onOrientation = jest.fn();
    renderHook(() => useDeviceOrientation(onOrientation, { enabled: true }));
    const observer = mockSubscribe.mock.calls[0][0];
    const tiltedUp = gravityAtPitch(45);
    observer.next(gravityAtPitch(0));
    onOrientation.mockClear();

    observer.next(tiltedUp);
    const [, firstY] = onOrientation.mock.calls[0];
    for (let i = 0; i < 50; i++) observer.next(tiltedUp);

    const [, convergedY] = lastEmission(onOrientation);
    expect(firstY).toBeGreaterThan(0);
    expect(Math.abs(firstY)).toBeLessThan(Math.abs(convergedY));
  });

  it('re-centres on the current orientation after the subscription is re-established', () => {
    const onOrientation = jest.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useDeviceOrientation(onOrientation, { enabled }),
      { initialProps: { enabled: true } },
    );
    const firstObserver = mockSubscribe.mock.calls[0][0];
    firstObserver.next(gravityAtPitch(20));
    firstObserver.next(gravityAtPitch(50));

    rerender({ enabled: false });
    rerender({ enabled: true });
    onOrientation.mockClear();
    mockSubscribe.mock.calls[1][0].next(gravityAtPitch(50));

    const [, y] = onOrientation.mock.calls[0];
    expect(y).toBeCloseTo(0);
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
