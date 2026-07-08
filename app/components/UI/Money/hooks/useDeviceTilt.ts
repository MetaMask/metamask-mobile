import { useEffect, useRef } from 'react';
import {
  accelerometer,
  SensorTypes,
  setUpdateIntervalForType,
} from 'react-native-sensors';
import { getTotalMemorySync } from 'react-native-device-info';

const GRAVITY = 9.81;
const SMOOTHING = 0.15;
const HZ_LOW_END = 30;
const HZ_DEFAULT = 60;
const ONE_GIGABYTE = 1024 * 1024 * 1024;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const isLowEndDevice = (): boolean => getTotalMemorySync() <= 2 * ONE_GIGABYTE;

interface UseDeviceTiltOptions {
  enabled?: boolean;
}

export function useDeviceTilt(
  onTilt: (x: number, y: number) => void,
  options?: UseDeviceTiltOptions,
): void {
  const enabled = options?.enabled ?? true;
  const onTiltRef = useRef(onTilt);
  const smoothed = useRef({ x: 0, y: 0 });

  useEffect(() => {
    onTiltRef.current = onTilt;
  }, [onTilt]);

  useEffect(() => {
    const hz = isLowEndDevice() ? HZ_LOW_END : HZ_DEFAULT;
    setUpdateIntervalForType(SensorTypes.accelerometer, 1000 / hz);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    smoothed.current = { x: 0, y: 0 };

    const subscription = accelerometer.subscribe({
      next: ({ x, y }) => {
        const nx = clamp(x / GRAVITY, -1, 1);
        const ny = clamp(y / GRAVITY, -1, 1);
        smoothed.current = {
          x: smoothed.current.x + SMOOTHING * (nx - smoothed.current.x),
          y: smoothed.current.y + SMOOTHING * (ny - smoothed.current.y),
        };
        onTiltRef.current(smoothed.current.x, smoothed.current.y);
      },
      error: () => undefined,
    });

    return () => subscription.unsubscribe();
  }, [enabled]);
}
