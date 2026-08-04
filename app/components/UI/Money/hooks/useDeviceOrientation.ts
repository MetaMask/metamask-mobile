import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  accelerometer,
  SensorTypes,
  setUpdateIntervalForType,
} from 'react-native-sensors';
import { getTotalMemorySync } from 'react-native-device-info';

const DEG = Math.PI / 180;
// Rotation away from neutral (per axis) that maps to a full ±1 tilt. Surfaces
// that render the animation small need less travel to read as movement.
const DEFAULT_TILT_TRAVEL = 30 * DEG;
// How long the neutral takes to follow a sustained change in holding angle.
const NEUTRAL_TRACKING_SECONDS = 4;
// Smallest roll gain the correction below will divide by. The gain vanishes as
// the device approaches vertical, where roll is no longer measurable and the
// reading is mostly sensor noise.
const ROLL_GAIN_FLOOR = 0.15;
// Low-pass factor: higher = snappier but noisier, lower = smoother but laggier.
const SMOOTHING = 0.2;
// Exponent shaping the reported tilt. Above 1 the response is gentle near the
// neutral and unchanged at the extremes.
const DEFAULT_RESPONSE_EXPONENT = 2;
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
 * Advances a neutral angle towards the angle currently being measured, so the
 * neutral follows the posture the device is actually held in and the response
 * never saturates at an extreme. Applied per axis: a habitual holding pitch or
 * a habitual grip roll both settle back to centre. Tracking is deliberately
 * slow: an intentional tilt still reads as a tilt before it decays to rest.
 *
 * Dividing by the sample rate keeps the tracking speed identical at 30Hz and
 * 60Hz. A `null` neutral means this is the first sample, so it adopts the
 * current angle rather than sliding in from a fixed one.
 */
export function trackNeutralAngle(
  neutral: number | null,
  angle: number,
  hz: number,
): number {
  if (neutral === null) return angle;
  return neutral + (angle - neutral) / (NEUTRAL_TRACKING_SECONDS * hz);
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
  travel: number = DEFAULT_TILT_TRAVEL,
): { x: number; y: number } {
  return {
    x: clamp((accelerationToRoll(x, y, z) - neutral.roll) / travel, -1, 1),
    y: clamp((accelerationToPitch(x, y, z) - neutral.pitch) / travel, -1, 1),
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
export function applyResponseCurve(
  tilt: number,
  exponent: number = DEFAULT_RESPONSE_EXPONENT,
): number {
  return Math.sign(tilt) * Math.abs(tilt) ** exponent;
}

interface UseDeviceOrientationOptions {
  enabled?: boolean;
  /**
   * Rotation away from neutral, in degrees, that maps to a full ±1 tilt.
   * Lower means a smaller movement reaches the animation's full travel.
   */
  travelDegrees?: number;
  /**
   * Exponent shaping the response. 1 is linear; higher damps small tilts more
   * aggressively at the cost of making the effect harder to notice.
   */
  responseExponent?: number;
}

/**
 * Reports device tilt as a normalized, clamped [-1, 1] value per axis, derived
 * from the accelerometer's absolute orientation (gravity), relative to an
 * adaptive neutral that follows the posture the device is held in on both
 * axes. Readings are normalized across platforms first, then smoothed and
 * shaped so hand tremor does not register. Unlike integrating the gyroscope,
 * this is drift-free.
 *
 * @param onOrientation - receives (x, y) roll/pitch in the [-1, 1] range.
 */
export function useDeviceOrientation(
  onOrientation: (x: number, y: number) => void,
  options?: UseDeviceOrientationOptions,
): void {
  const enabled = options?.enabled ?? true;
  const travel = options?.travelDegrees
    ? options.travelDegrees * DEG
    : DEFAULT_TILT_TRAVEL;
  const responseExponent =
    options?.responseExponent ?? DEFAULT_RESPONSE_EXPONENT;
  const onOrientationRef = useRef(onOrientation);
  const smoothed = useRef({ x: 0, y: 0 });
  const neutralPitch = useRef<number | null>(null);
  const neutralRoll = useRef<number | null>(null);

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

    const subscription = accelerometer.subscribe({
      next: (sample) => {
        const { x, y, z } = normalizeReading(sample, Platform.OS);
        const pitch = accelerationToPitch(x, y, z);
        const roll = accelerationToRoll(x, y, z);
        neutralPitch.current = trackNeutralAngle(
          neutralPitch.current,
          pitch,
          hz,
        );
        neutralRoll.current = trackNeutralAngle(neutralRoll.current, roll, hz);
        const tilt = accelerationToTilt(
          x,
          y,
          z,
          {
            pitch: neutralPitch.current,
            roll: neutralRoll.current,
          },
          travel,
        );
        smoothed.current = {
          x: smoothed.current.x + SMOOTHING * (tilt.x - smoothed.current.x),
          y: smoothed.current.y + SMOOTHING * (tilt.y - smoothed.current.y),
        };
        onOrientationRef.current(
          applyResponseCurve(smoothed.current.x, responseExponent),
          applyResponseCurve(smoothed.current.y, responseExponent),
        );
      },
      error: () => undefined,
    });

    return () => subscription.unsubscribe();
  }, [enabled, travel, responseExponent]);
}
