import { useCallback, useEffect, useRef } from 'react';
import {
  useViewModelInstance,
  type RiveFile,
  type ViewModelInstance,
  type ViewModelNumberProperty,
} from '@rive-app/react-native';
import { useDeviceOrientation } from './useDeviceOrientation';
import { pitchToParallaxValue, tiltToParallaxValue } from '../utils/parallax';

/** ViewModel numbers (0-100, rest 50) driving the tilt per axis. */
const RIVE_PROPERTY_X = 'xValue';
const RIVE_PROPERTY_Y = 'yValue';

interface UseRiveParallaxTiltOptions {
  /** Rive artboard whose default view model drives the tilt. */
  artboardName: string;
  /** Whether the device-orientation subscription should be active. */
  enabled: boolean;
}

/**
 * Binds the default view model of a Rive artboard (the Nitro replacement for
 * the legacy `AutoBind(true)` mode) and drives its `xValue` / `yValue` number
 * properties from device orientation.
 *
 * Values are written through cached property handles rather than
 * `useRiveNumber`: that hook echoes every value back to JS through setState,
 * re-rendering at the accelerometer sample rate for values the callers never
 * read.
 *
 * Returns the bound instance for `RiveView`'s `dataBind` prop (null while the
 * file or instance is still loading).
 */
export const useRiveParallaxTilt = (
  riveFile: RiveFile | null | undefined,
  { artboardName, enabled }: UseRiveParallaxTiltOptions,
): ViewModelInstance | null => {
  const { instance } = useViewModelInstance(riveFile, {
    artboardName,
    async: true,
  });

  const xPropertyRef = useRef<ViewModelNumberProperty | null>(null);
  const yPropertyRef = useRef<ViewModelNumberProperty | null>(null);

  useEffect(() => {
    if (!instance) return undefined;
    xPropertyRef.current = instance.numberProperty(RIVE_PROPERTY_X) ?? null;
    yPropertyRef.current = instance.numberProperty(RIVE_PROPERTY_Y) ?? null;
    return () => {
      xPropertyRef.current = null;
      yPropertyRef.current = null;
    };
  }, [instance]);

  const applyTilt = useCallback((x: number, y: number) => {
    xPropertyRef.current?.set(tiltToParallaxValue(x));
    yPropertyRef.current?.set(pitchToParallaxValue(y));
  }, []);

  useDeviceOrientation(applyTilt, { enabled });

  return instance ?? null;
};
