import { renderHook } from '@testing-library/react-native';
import {
  accelerationToPitch,
  accelerationToRoll,
  accelerationToTilt,
  normalizeReading,
  trackNeutralAngle,
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

interface Acceleration {
  x: number;
  y: number;
  z: number;
}

/** Gravity vector for a device pitched `degrees` back from horizontal. */
const gravityAtPitch = (degrees: number): Acceleration => ({
  x: 0,
  y: G * Math.sin(degrees * DEG),
  z: G * Math.cos(degrees * DEG),
});

/** Gravity vector for a device rolled `degrees` around its long axis. */
const gravityAtRoll = (degrees: number): Acceleration => ({
  x: G * Math.sin(degrees * DEG),
  y: 0,
  z: G * Math.cos(degrees * DEG),
});

/**
 * Gravity vector for a device pitched `thetaDegrees` back from horizontal and
 * rolled `phiDegrees` around its long axis — i.e. a real holding posture.
 */
const gravityAtPitchAndRoll = (
  thetaDegrees: number,
  phiDegrees: number,
): Acceleration => ({
  x: G * Math.cos(thetaDegrees * DEG) * Math.sin(phiDegrees * DEG),
  y: G * Math.sin(thetaDegrees * DEG),
  z: G * Math.cos(thetaDegrees * DEG) * Math.cos(phiDegrees * DEG),
});

/**
 * The raw reading iOS CoreMotion reports for the posture Android reports as
 * `reading`: gravity as a negative vector rather than proper acceleration.
 */
const asIosReading = (reading: Acceleration): Acceleration => ({
  x: -reading.x,
  y: -reading.y,
  z: -reading.z,
});

const rollAt = (thetaDegrees: number, phiDegrees: number) => {
  const { x, y, z } = gravityAtPitchAndRoll(thetaDegrees, phiDegrees);
  return accelerationToRoll(x, y, z);
};

const tiltAt = (pitchDegrees: number, neutralDegrees: number) => {
  const { x, y, z } = gravityAtPitch(pitchDegrees);
  return accelerationToTilt(x, y, z, { pitch: neutralDegrees * DEG, roll: 0 });
};

describe('normalizeReading', () => {
  const sample: Acceleration = { x: 1, y: -2, z: 3 };

  /** One physical posture, as each platform reports it, normalized. */
  const bothConventions = (posture: Acceleration) => ({
    android: normalizeReading(posture, 'android'),
    ios: normalizeReading(asIosReading(posture), 'ios'),
  });

  it('negates every component on ios', () => {
    expect(normalizeReading(sample, 'ios')).toEqual({ x: -1, y: 2, z: -3 });
  });

  it.each(['android', 'macos', 'windows', 'web'] as const)(
    'leaves every component unchanged on %s',
    (os) => {
      expect(normalizeReading(sample, os)).toEqual(sample);
    },
  );

  // Without normalization the conventions mirror each other, so a posture that
  // reads as pitched up on one platform reads as pitched down on the other.
  it('mirrors the pitch when an ios reading is left unnormalized', () => {
    const { x, y, z } = asIosReading(gravityAtPitch(40));

    expect(accelerationToPitch(x, y, z)).toBeCloseTo(-40 * DEG, 10);
  });

  it('resolves both conventions of a pitched posture to the same pitch', () => {
    const { android, ios } = bothConventions(gravityAtPitch(40));

    const pitch = accelerationToPitch(android.x, android.y, android.z);

    expect(pitch).toBeCloseTo(40 * DEG, 10);
    expect(accelerationToPitch(ios.x, ios.y, ios.z)).toBeCloseTo(pitch, 10);
  });

  it('resolves both conventions of a rolled posture to the same roll', () => {
    const { android, ios } = bothConventions(gravityAtPitchAndRoll(60, 25));

    const roll = accelerationToRoll(android.x, android.y, android.z);

    expect(roll).toBeGreaterThan(0);
    expect(accelerationToRoll(ios.x, ios.y, ios.z)).toBeCloseTo(roll, 10);
  });
});

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
  it.each([-45, 45])(
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
  it.each([-30, 0, 70])(
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

    const tilt = accelerationToTilt(x, y, z, { pitch: 0, roll: 0 });

    expect(tilt.x).toBeCloseTo(15 / 30);
  });

  it('reports a negative roll when tilted left', () => {
    const { x, y, z } = gravityAtRoll(-15);

    const tilt = accelerationToTilt(x, y, z, { pitch: 0, roll: 0 });

    expect(tilt.x).toBeCloseTo(-15 / 30);
  });

  it('clamps the roll to the [-1, 1] range beyond the travel', () => {
    const right = gravityAtRoll(75);
    const left = gravityAtRoll(-75);

    expect(
      accelerationToTilt(right.x, right.y, right.z, { pitch: 0, roll: 0 }).x,
    ).toBe(1);
    expect(
      accelerationToTilt(left.x, left.y, left.z, { pitch: 0, roll: 0 }).x,
    ).toBe(-1);
  });

  it('reports a near-full roll for a 30 degree roll at a 75 degree holding pitch', () => {
    const right = gravityAtPitchAndRoll(75, 30);
    const left = gravityAtPitchAndRoll(75, -30);

    expect(
      accelerationToTilt(right.x, right.y, right.z, { pitch: 0, roll: 0 }).x,
    ).toBeGreaterThan(0.9);
    expect(
      accelerationToTilt(left.x, left.y, left.z, { pitch: 0, roll: 0 }).x,
    ).toBeLessThan(-0.9);
  });

  it('leaves the roll unchanged when the neutral pitch changes', () => {
    const { x, y, z } = gravityAtRoll(15);

    const atZeroNeutral = accelerationToTilt(x, y, z, { pitch: 0, roll: 0 });
    const atUprightNeutral = accelerationToTilt(x, y, z, {
      pitch: 90 * DEG,
      roll: 0,
    });

    expect(atUprightNeutral.x).toBe(atZeroNeutral.x);
  });

  it('reports no roll offset when the reading matches the neutral roll', () => {
    const { x, y, z } = gravityAtRoll(20);

    const tilt = accelerationToTilt(x, y, z, {
      pitch: 0,
      roll: accelerationToRoll(x, y, z),
    });

    expect(tilt.x).toBeCloseTo(0);
  });

  it('reports a roll offset measured from the neutral roll', () => {
    const { x, y, z } = gravityAtRoll(25);

    const tilt = accelerationToTilt(x, y, z, { pitch: 0, roll: 15 * DEG });

    expect(tilt.x).toBeCloseTo(10 / 30);
  });

  it('leaves the pitch unchanged when the neutral roll changes', () => {
    const { x, y, z } = gravityAtPitch(15);

    const atZeroNeutral = accelerationToTilt(x, y, z, { pitch: 0, roll: 0 });
    const atRolledNeutral = accelerationToTilt(x, y, z, {
      pitch: 0,
      roll: 30 * DEG,
    });

    expect(atRolledNeutral.y).toBe(atZeroNeutral.y);
  });
});

describe('trackNeutralAngle', () => {
  it('adopts the measured angle when there is no neutral yet', () => {
    const angle = 0.42;

    const neutral = trackNeutralAngle(null, angle, 60);

    expect(neutral).toBe(angle);
  });

  it('moves a small fraction of the way from the neutral towards the angle', () => {
    const neutral = trackNeutralAngle(0, 1, 60);

    expect(neutral).toBeGreaterThan(0);
    expect(neutral).toBeLessThan(1);
    expect(neutral).toBeLessThan(0.05);
  });

  it('advances the same amount at 30Hz over two samples as at 60Hz over four', () => {
    let atThirtyHz = 0;
    let atSixtyHz = 0;

    for (let i = 0; i < 2; i++)
      atThirtyHz = trackNeutralAngle(atThirtyHz, 1, 30);
    for (let i = 0; i < 4; i++) atSixtyHz = trackNeutralAngle(atSixtyHz, 1, 60);

    expect(atThirtyHz).toBeCloseTo(atSixtyHz, 3);
  });

  it('converges on the angle when applied repeatedly', () => {
    let neutral = 0;

    for (let i = 0; i < 5000; i++) neutral = trackNeutralAngle(neutral, 1, 60);

    expect(neutral).toBeCloseTo(1, 5);
  });
});

describe('useDeviceOrientation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe });
    mockGetTotalMemorySync.mockReturnValue(FOUR_GB);
  });

  // The test setup pins `Platform.OS` to 'ios', so the hook normalizes with the
  // iOS sign and the readings fed to it below are in the iOS convention.
  const pitchedAt = (degrees: number) => asIosReading(gravityAtPitch(degrees));

  const heldAt = (thetaDegrees: number, phiDegrees: number) =>
    asIosReading(gravityAtPitchAndRoll(thetaDegrees, phiDegrees));

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
    const upright = pitchedAt(90);

    for (let i = 0; i < 100; i++) observer.next(upright);

    const [x, y] = lastEmission(onOrientation);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
  });

  it('emits a positive pitch once the device tilts up from its reference orientation', () => {
    const onOrientation = jest.fn();
    renderHook(() => useDeviceOrientation(onOrientation, { enabled: true }));
    const observer = mockSubscribe.mock.calls[0][0];
    const tiltedUp = pitchedAt(45);

    observer.next(pitchedAt(0));
    for (let i = 0; i < 50; i++) observer.next(tiltedUp);

    const [, y] = lastEmission(onOrientation);
    expect(y).toBeGreaterThan(0.9);
  });

  it('emits a negative pitch once the device tilts down from its reference orientation', () => {
    const onOrientation = jest.fn();
    renderHook(() => useDeviceOrientation(onOrientation, { enabled: true }));
    const observer = mockSubscribe.mock.calls[0][0];
    const tiltedDown = pitchedAt(0);

    observer.next(pitchedAt(45));
    for (let i = 0; i < 50; i++) observer.next(tiltedDown);

    const [, y] = lastEmission(onOrientation);
    expect(y).toBeLessThan(-0.9);
  });

  it('emits a smaller magnitude on the first sample after a tilt than once converged', () => {
    const onOrientation = jest.fn();
    renderHook(() => useDeviceOrientation(onOrientation, { enabled: true }));
    const observer = mockSubscribe.mock.calls[0][0];
    const tiltedUp = pitchedAt(45);
    observer.next(pitchedAt(0));
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
    firstObserver.next(pitchedAt(20));
    firstObserver.next(pitchedAt(50));

    rerender({ enabled: false });
    rerender({ enabled: true });
    onOrientation.mockClear();
    mockSubscribe.mock.calls[1][0].next(pitchedAt(50));

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

    expect(() => mockSubscribe.mock.calls[0][0].error()).not.toThrow();
  });

  describe('roll neutral', () => {
    // A habitual grip roll used to sit at its full offset forever, pinning the
    // X axis at ±1 and leaving no travel for an actual roll gesture.
    it('re-centres on a sustained grip roll rather than staying pinned', () => {
      const onOrientation = jest.fn();
      renderHook(() => useDeviceOrientation(onOrientation, { enabled: true }));
      const observer = mockSubscribe.mock.calls[0][0];
      const gripped = heldAt(60, 45);

      observer.next(heldAt(60, 0));
      observer.next(gripped);
      const [pinnedX] = lastEmission(onOrientation);
      for (let i = 0; i < 3000; i++) observer.next(gripped);

      const [settledX] = lastEmission(onOrientation);
      expect(pinnedX).toBeGreaterThan(0);
      expect(settledX).toBeCloseTo(0, 2);
    });

    it('still reports a further roll once the roll neutral has settled', () => {
      const onOrientation = jest.fn();
      renderHook(() => useDeviceOrientation(onOrientation, { enabled: true }));
      const observer = mockSubscribe.mock.calls[0][0];
      const gripped = heldAt(60, 20);
      for (let i = 0; i < 3000; i++) observer.next(gripped);

      for (let i = 0; i < 30; i++) observer.next(heldAt(60, 40));
      const [rolledRightX] = lastEmission(onOrientation);
      for (let i = 0; i < 60; i++) observer.next(heldAt(60, 0));

      const [rolledLeftX] = lastEmission(onOrientation);
      expect(rolledRightX).toBeGreaterThan(0.3);
      expect(rolledLeftX).toBeLessThan(-0.3);
    });

    it('resets the roll neutral when the subscription is re-established', () => {
      const onOrientation = jest.fn();
      const { rerender } = renderHook(
        ({ enabled }) => useDeviceOrientation(onOrientation, { enabled }),
        { initialProps: { enabled: true } },
      );
      const firstObserver = mockSubscribe.mock.calls[0][0];
      firstObserver.next(heldAt(60, 0));
      firstObserver.next(heldAt(60, 30));
      expect(lastEmission(onOrientation)[0]).toBeGreaterThan(0);

      rerender({ enabled: false });
      rerender({ enabled: true });
      onOrientation.mockClear();
      mockSubscribe.mock.calls[1][0].next(heldAt(60, 30));

      const [x] = onOrientation.mock.calls[0];
      expect(x).toBeCloseTo(0);
    });
  });
});
