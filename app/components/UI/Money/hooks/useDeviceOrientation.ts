import { useEffect, useRef } from 'react';
import {
  accelerometer,
  SensorTypes,
  setUpdateIntervalForType,
} from 'react-native-sensors';
import { getTotalMemorySync } from 'react-native-device-info';

const DEG = Math.PI / 180;
// Natural holding angle: people hold the phone tilted ~this far back from
// horizontal. Treated as the neutral (rest) pitch, so holding normally sits at
// the centre of the parallax rather than an extreme.
const NEUTRAL_PITCH = 45 * DEG;
// Rotation away from neutral (per axis) that maps to a full ±1 tilt.
const PITCH_TRAVEL = 30 * DEG;
const ROLL_TRAVEL = 30 * DEG;
// Low-pass factor: higher = snappier but noisier, lower = smoother but laggier.
const SMOOTHING = 0.2;
const HZ_LOW_END = 30;
const HZ_DEFAULT = 60;
const ONE_GIGABYTE = 1024 * 1024 * 1024;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const isLowEndDevice = (): boolean => getTotalMemorySync() <= 2 * ONE_GIGABYTE;

/**
 * Converts a gravity vector (accelerometer reading) into a normalized,
 * clamped [-1, 1] tilt per axis, measured as absolute pitch/roll relative to
 * the natural holding position. Pure so it can be unit-tested directly.
 */
export function accelerationToTilt(
  x: number,
  y: number,
  z: number,
): { x: number; y: number } {
  const pitch = Math.atan2(y, Math.hypot(x, z));
  const roll = Math.atan2(x, Math.hypot(y, z));
  return {
    x: clamp(roll / ROLL_TRAVEL, -1, 1),
    y: clamp((pitch - NEUTRAL_PITCH) / PITCH_TRAVEL, -1, 1),
  };
}

interface UseDeviceOrientationOptions {
  enabled?: boolean;
}

/**
 * Reports device tilt as a normalized, clamped [-1, 1] value per axis, derived
 * from the accelerometer's absolute orientation (gravity) with a natural-hold
 * neutral. Unlike integrating the gyroscope, this is drift-free and returns to
 * the same neutral for the same physical orientation.
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

  useEffect(() => {
    onOrientationRef.current = onOrientation;
  }, [onOrientation]);

  useEffect(() => {
    const hz = isLowEndDevice() ? HZ_LOW_END : HZ_DEFAULT;
    setUpdateIntervalForType(SensorTypes.accelerometer, 1000 / hz);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    smoothed.current = { x: 0, y: 0 };

    const subscription = accelerometer.subscribe({
      next: ({ x, y, z }) => {
        const tilt = accelerationToTilt(x, y, z);
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
