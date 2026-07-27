import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  accelerometer,
  SensorTypes,
  setUpdateIntervalForType,
} from 'react-native-sensors';
import { getTotalMemorySync } from 'react-native-device-info';

const DEG = Math.PI / 180;
// react-native-sensors forwards raw platform readings without normalizing them,
// and the two platforms disagree on sign: CoreMotion reports gravity as a
// negative vector (flat device reads z = -1g) while Android reports proper
// acceleration (flat device reads z = +9.81). Left unhandled, every axis is
// mirrored between platforms. iOS is flipped into Android's convention here —
// the axis pointing up reads positive. Magnitude differences (g vs m/s²) need
// no handling: every reading below is either an atan2 or a ratio.
const GRAVITY_SIGN = Platform.OS === 'ios' ? -1 : 1;
// Rotation away from neutral (per axis) that maps to a full ±1 tilt.
const PITCH_TRAVEL = 30 * DEG;
const ROLL_TRAVEL = 30 * DEG;
// How long the neutral takes to follow a sustained change in holding angle.
const NEUTRAL_TRACKING_SECONDS = 4;
// Smallest roll gain the correction below will divide by. The gain vanishes as
// the device approaches vertical, where roll is no longer measurable and the
// reading is mostly sensor noise.
const ROLL_GAIN_FLOOR = 0.15;
// Low-pass factor: higher = snappier but noisier, lower = smoother but laggier.
const SMOOTHING = 0.2;
const HZ_LOW_END = 30;
const HZ_DEFAULT = 60;
const ONE_GIGABYTE = 1024 * 1024 * 1024;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const isLowEndDevice = (): boolean => getTotalMemorySync() <= 2 * ONE_GIGABYTE;

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

interface UseDeviceOrientationOptions {
  enabled?: boolean;
}

/**
 * Reports device tilt as a normalized, clamped [-1, 1] value per axis, derived
 * from the accelerometer's absolute orientation (gravity), relative to an
 * adaptive neutral that follows the posture the device is held in on both
 * axes. Readings are normalized across platforms first. Unlike integrating the
 * gyroscope, this is drift-free.
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
        // A single non-finite sample would otherwise poison the neutral and the
        // smoothing accumulators for the life of the subscription.
        if (
          !Number.isFinite(sample.x) ||
          !Number.isFinite(sample.y) ||
          !Number.isFinite(sample.z)
        ) {
          return;
        }

        const x = sample.x * GRAVITY_SIGN;
        const y = sample.y * GRAVITY_SIGN;
        const z = sample.z * GRAVITY_SIGN;

        const pitch = accelerationToPitch(x, y, z);
        const roll = accelerationToRoll(x, y, z);
        neutralPitch.current = trackNeutralAngle(
          neutralPitch.current,
          pitch,
          hz,
        );
        neutralRoll.current = trackNeutralAngle(neutralRoll.current, roll, hz);
        const tilt = accelerationToTilt(x, y, z, {
          pitch: neutralPitch.current,
          roll: neutralRoll.current,
        });
        smoothed.current = {
          x: smoothed.current.x + SMOOTHING * (tilt.x - smoothed.current.x),
          y: smoothed.current.y + SMOOTHING * (tilt.y - smoothed.current.y),
        };
        onOrientationRef.current(smoothed.current.x, smoothed.current.y);
      },
      error: () => undefined,
    });

    return () => subscription.unsubscribe();
  }, [enabled]);
}
