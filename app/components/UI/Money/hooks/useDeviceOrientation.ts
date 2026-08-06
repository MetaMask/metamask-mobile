import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  accelerometer,
  SensorTypes,
  setUpdateIntervalForType,
} from 'react-native-sensors';
import { getTotalMemorySync } from 'react-native-device-info';

const DEG = Math.PI / 180;
// Rotation away from neutral (per axis) that maps to a full ±1 tilt.
const PITCH_TRAVEL = 30 * DEG;
const ROLL_TRAVEL = 30 * DEG;
// How long the neutral takes to follow a sustained change in holding angle
// while the device is being actively rotated. Kept slow so a deliberate tilt
// reaches its full travel instead of the neutral chasing it.
const NEUTRAL_TRACKING_SECONDS_MOVING = 4;
// The same, once the device has come to rest. A device set down at a new angle
// would otherwise hold a skewed pose for seconds before drifting back.
const NEUTRAL_TRACKING_SECONDS_STILL = 0.6;
// Angular speed (rad/s) at and above which the neutral is held completely
// still. Roughly the speed of a deliberate tilt, well above hand tremor.
const NEUTRAL_HOLD_SPEED = 0.25;
// Low-pass factor for the angular speed estimate. Slower than the tilt's own
// smoothing so a momentary pause mid-gesture does not re-centre the neutral.
const SPEED_SMOOTHING = 0.1;
// Smallest roll gain the correction below will divide by. The gain vanishes as
// the device approaches vertical, where roll is no longer measurable and the
// reading is mostly sensor noise.
const ROLL_GAIN_FLOOR = 0.15;
// Low-pass factor: higher = snappier but noisier, lower = smoother but laggier.
const SMOOTHING = 0.2;
// Exponent shaping the reported tilt. Above 1 the response is gentle near the
// neutral and unchanged at the extremes.
const RESPONSE_EXPONENT = 2;
const HZ_LOW_END = 30;
const HZ_DEFAULT = 60;
const ONE_GIGABYTE = 1024 * 1024 * 1024;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const isLowEndDevice = (): boolean => getTotalMemorySync() <= 2 * ONE_GIGABYTE;

export interface Acceleration {
  x: number;
  y: number;
  z: number;
}

/**
 * Normalizes a raw accelerometer reading so the axis pointing up reads
 * positive, whichever platform produced it. Pure so it can be unit-tested
 * directly.
 *
 * `react-native-sensors` forwards raw platform values, and the platforms
 * disagree on sign: CoreMotion reports gravity as a negative vector (a flat
 * device reads z = -1, in g) while Android reports proper acceleration
 * (z = +9.81, in m/s²). Left unhandled, every axis is mirrored between the two.
 * Magnitude differences need no handling — every reading below is consumed by
 * an atan2 or a ratio.
 */
export function normalizeReading(
  sample: Acceleration,
  os: typeof Platform.OS,
): Acceleration {
  const sign = os === 'ios' ? -1 : 1;
  return { x: sample.x * sign, y: sample.y * sign, z: sample.z * sign };
}

/**
 * Converts a gravity vector (accelerometer reading) into the device's absolute
 * pitch in radians. Pure so it can be unit-tested directly.
 */
export function accelerationToPitch(x: number, y: number, z: number): number {
  return Math.atan2(y, Math.hypot(x, z));
}

/**
 * Estimates how fast an angle is currently changing, in radians per second,
 * smoothed so a single noisy sample cannot pass for a gesture. A `null`
 * previous angle means this is the first sample, which carries no speed
 * information. Pure so it can be unit-tested directly.
 */
export function trackAngularSpeed(
  smoothedSpeed: number,
  previousAngle: number | null,
  angle: number,
  hz: number,
): number {
  if (previousAngle === null) return 0;
  const speed = Math.abs(angle - previousAngle) * hz;
  return smoothedSpeed + SPEED_SMOOTHING * (speed - smoothedSpeed);
}

/**
 * Chooses how quickly the neutral should follow the measured angle, given how
 * fast the device is currently rotating.
 *
 * These two requirements pull in opposite directions: a deliberate tilt needs
 * the neutral to stay put, or it chases the device and swallows the very
 * travel the tilt is meant to produce; a device set down at a new angle needs
 * the neutral to catch up quickly, or the graphic holds a skewed pose long
 * enough to read as broken. Rotation speed separates the two cases — turning
 * means "register this", still means "this is the new rest" — so the tracking
 * blends between the two time constants rather than picking one. Blending
 * rather than switching keeps a gesture from visibly changing character as it
 * slows down. Pure so it can be unit-tested directly.
 */
export function neutralTrackingSeconds(angularSpeed: number): number {
  const holdRatio = Math.min(angularSpeed / NEUTRAL_HOLD_SPEED, 1);
  return (
    NEUTRAL_TRACKING_SECONDS_STILL +
    (NEUTRAL_TRACKING_SECONDS_MOVING - NEUTRAL_TRACKING_SECONDS_STILL) *
      holdRatio
  );
}

/**
 * Advances a neutral angle towards the angle currently being measured, so the
 * neutral follows the posture the device is actually held in and the response
 * never saturates at an extreme. Applied per axis: a habitual holding pitch or
 * a habitual grip roll both settle back to centre.
 *
 * Dividing by the sample rate keeps the tracking speed identical at 30Hz and
 * 60Hz. A `null` neutral means this is the first sample, so it adopts the
 * current angle rather than sliding in from a fixed one.
 */
export function trackNeutralAngle(
  neutral: number | null,
  angle: number,
  hz: number,
  trackingSeconds: number,
): number {
  if (neutral === null) return angle;
  return neutral + (angle - neutral) / (trackingSeconds * hz);
}

/**
 * Converts a gravity vector (accelerometer reading) into the device's roll in
 * radians, corrected for how far back the device is pitched.
 *
 * Roll measured against the horizontal plane scales with the cosine of the
 * pitch, so a device held upright barely registers a roll it would register
 * fully when lying flat. Dividing that factor out keeps the response constant
 * across holding angles; the floor bounds the correction near vertical, where
 * the roll component has collapsed into noise. Pure so it can be unit-tested
 * directly.
 */
export function accelerationToRoll(x: number, y: number, z: number): number {
  const magnitude = Math.hypot(x, y, z);
  if (magnitude === 0) return 0;
  const pitchGain = Math.max(Math.hypot(x, z) / magnitude, ROLL_GAIN_FLOOR);
  return Math.atan2(x, Math.hypot(y, z)) / pitchGain;
}

/**
 * Converts a gravity vector (accelerometer reading) into a normalized,
 * clamped [-1, 1] tilt per axis, measured as pitch/roll relative to the
 * supplied neutral angles. Pure so it can be unit-tested directly.
 */
export function accelerationToTilt(
  x: number,
  y: number,
  z: number,
  neutral: { pitch: number; roll: number },
): { x: number; y: number } {
  return {
    x: clamp((accelerationToRoll(x, y, z) - neutral.roll) / ROLL_TRAVEL, -1, 1),
    y: clamp(
      (accelerationToPitch(x, y, z) - neutral.pitch) / PITCH_TRAVEL,
      -1,
      1,
    ),
  };
}

/**
 * Shapes a normalized [-1, 1] tilt into the value reported to callers.
 *
 * Low-pass smoothing cannot separate hand tremor from a slow deliberate tilt —
 * both move the reading by a little each frame — and smoothing harder only
 * trades jitter for lag. Scaling the output by how far the device has actually
 * turned does separate them: tremor sits where the curve is flat and is
 * attenuated by an order of magnitude, a full tilt still reaches full travel,
 * and no latency is added. Pure so it can be unit-tested directly.
 */
export function applyResponseCurve(tilt: number): number {
  return Math.sign(tilt) * Math.abs(tilt) ** RESPONSE_EXPONENT;
}

interface UseDeviceOrientationOptions {
  enabled?: boolean;
}

/**
 * Reports device tilt as a normalized, clamped [-1, 1] value per axis, derived
 * from the accelerometer's absolute orientation (gravity), relative to an
 * adaptive neutral that follows the posture the device is held in on both
 * axes. The neutral holds still while the device is turning and catches up
 * quickly once it stops, so a tilt reads at full travel but a device set down
 * at any angle settles back to rest. Readings are normalized across platforms
 * first, then smoothed and shaped so hand tremor does not register. Unlike
 * integrating the gyroscope, this is drift-free.
 *
 * @param onOrientation - receives (x, y) roll/pitch in the [-1, 1] range.
 */
export function useDeviceOrientation(
  onOrientation: (x: number, y: number) => void,
  options?: UseDeviceOrientationOptions,
): void {
  const enabled = options?.enabled ?? true;
  const onOrientationRef = useRef(onOrientation);
  const smoothed = useRef({ x: 0, y: 0 });
  const neutralPitch = useRef<number | null>(null);
  const neutralRoll = useRef<number | null>(null);
  const previousPitch = useRef<number | null>(null);
  const previousRoll = useRef<number | null>(null);
  const pitchSpeed = useRef(0);
  const rollSpeed = useRef(0);

  useEffect(() => {
    onOrientationRef.current = onOrientation;
  }, [onOrientation]);

  useEffect(() => {
    // Do no sensor work (including reading device memory) while disabled — e.g.
    // when the feature flag is off or reduce-motion is on.
    if (!enabled) return undefined;

    const hz = isLowEndDevice() ? HZ_LOW_END : HZ_DEFAULT;
    setUpdateIntervalForType(SensorTypes.accelerometer, 1000 / hz);

    smoothed.current = { x: 0, y: 0 };
    neutralPitch.current = null;
    neutralRoll.current = null;
    previousPitch.current = null;
    previousRoll.current = null;
    pitchSpeed.current = 0;
    rollSpeed.current = 0;

    const subscription = accelerometer.subscribe({
      next: (sample) => {
        const { x, y, z } = normalizeReading(sample, Platform.OS);
        const pitch = accelerationToPitch(x, y, z);
        const roll = accelerationToRoll(x, y, z);
        pitchSpeed.current = trackAngularSpeed(
          pitchSpeed.current,
          previousPitch.current,
          pitch,
          hz,
        );
        rollSpeed.current = trackAngularSpeed(
          rollSpeed.current,
          previousRoll.current,
          roll,
          hz,
        );
        previousPitch.current = pitch;
        previousRoll.current = roll;
        neutralPitch.current = trackNeutralAngle(
          neutralPitch.current,
          pitch,
          hz,
          neutralTrackingSeconds(pitchSpeed.current),
        );
        neutralRoll.current = trackNeutralAngle(
          neutralRoll.current,
          roll,
          hz,
          neutralTrackingSeconds(rollSpeed.current),
        );
        const tilt = accelerationToTilt(x, y, z, {
          pitch: neutralPitch.current,
          roll: neutralRoll.current,
        });
        smoothed.current = {
          x: smoothed.current.x + SMOOTHING * (tilt.x - smoothed.current.x),
          y: smoothed.current.y + SMOOTHING * (tilt.y - smoothed.current.y),
        };
        onOrientationRef.current(
          applyResponseCurve(smoothed.current.x),
          applyResponseCurve(smoothed.current.y),
        );
      },
      error: () => undefined,
    });

    return () => subscription.unsubscribe();
  }, [enabled]);
}
