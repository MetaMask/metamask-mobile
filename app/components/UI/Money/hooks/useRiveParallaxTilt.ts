import { useCallback, useEffect, useRef } from 'react';
import {
  useViewModelInstance,
  type RiveFile,
  type ViewModelInstance,
  type ViewModelNumberProperty,
} from '@rive-app/react-native';
import { useDeviceOrientation } from './useDeviceOrientation';
import {
  RIVE_TILT_WRITE_EPSILON,
  pitchToParallaxValue,
  tiltToParallaxValue,
} from '../utils/parallax';

/** ViewModel numbers (0-100, rest 50) driving the tilt per axis. */
const RIVE_PROPERTY_X = 'xValue';
const RIVE_PROPERTY_Y = 'yValue';

interface UseRiveParallaxTiltOptions {
  /** Rive artboard whose default view model drives the tilt. */
  artboardName: string;
  /** Whether the device-orientation subscription should be active. */
  enabled: boolean;
  /**
   * Shapes the normalized [-1, 1] device tilt before it is mapped to Rive
   * units. Each surface tunes stillness and reach differently (see
   * `utils/parallax`), so the shaping lives at the call site. `hz` is the
   * rate the sensor is being sampled at, for shapers that smooth across
   * samples. Must be referentially stable.
   */
  shapeTilt: (x: number, y: number, hz: number) => { x: number; y: number };
}

/**
 * Binds the default view model of a Rive artboard (the Nitro replacement for
 * the legacy `AutoBind(true)` mode) and drives its `xValue` / `yValue` number
 * properties from device orientation, through the caller's shaping function.
 *
 * Values are written through cached property handles rather than
 * `useRiveNumber`: that hook echoes every value back to JS through setState,
 * re-rendering at the accelerometer sample rate for values the callers never
 * read.
 *
 * Writes that change an axis by less than `RIVE_TILT_WRITE_EPSILON` are
 * skipped: a device lying still still produces a full sample stream, every
 * value of it identical to the last, and holding the last value written per
 * axis turns that steady state into no work at all. The cache is dropped
 * whenever the bound instance or the enabled state changes: a freshly mounted
 * artboard starts at its own rest pose, and a stale cache would suppress the
 * write that puts it back where the device is pointing.
 *
 * Returns the bound instance for `RiveView`'s `dataBind` prop (null while the
 * file or instance is still loading).
 */
export const useRiveParallaxTilt = (
  riveFile: RiveFile | null | undefined,
  { artboardName, enabled, shapeTilt }: UseRiveParallaxTiltOptions,
): ViewModelInstance | null => {
  const { instance } = useViewModelInstance(riveFile, {
    artboardName,
    async: true,
  });

  const xPropertyRef = useRef<ViewModelNumberProperty | null>(null);
  const yPropertyRef = useRef<ViewModelNumberProperty | null>(null);
  /** Last values written per axis, in the artboard's own 0-100 units. */
  const lastWritten = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    lastWritten.current = null;
    if (!instance) return undefined;
    xPropertyRef.current = instance.numberProperty(RIVE_PROPERTY_X) ?? null;
    yPropertyRef.current = instance.numberProperty(RIVE_PROPERTY_Y) ?? null;
    return () => {
      xPropertyRef.current = null;
      yPropertyRef.current = null;
    };
  }, [instance, enabled]);

  const applyTilt = useCallback(
    (x: number, y: number, hz: number) => {
      const shaped = shapeTilt(x, y, hz);
      const nextX = tiltToParallaxValue(shaped.x);
      const nextY = pitchToParallaxValue(shaped.y);

      const previous = lastWritten.current;
      const written = { x: previous?.x ?? nextX, y: previous?.y ?? nextY };

      if (
        !previous ||
        Math.abs(nextX - previous.x) >= RIVE_TILT_WRITE_EPSILON
      ) {
        xPropertyRef.current?.set(nextX);
        written.x = nextX;
      }
      if (
        !previous ||
        Math.abs(nextY - previous.y) >= RIVE_TILT_WRITE_EPSILON
      ) {
        yPropertyRef.current?.set(nextY);
        written.y = nextY;
      }

      lastWritten.current = written;
    },
    [shapeTilt],
  );

  useDeviceOrientation(applyTilt, { enabled });

  return instance ?? null;
};
