import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

import {
  getRememberedReduceTransparency,
  rememberReduceTransparency,
} from './reduceTransparencyMemory';
import { useTheme } from '../../util/theme';
import { AppThemeKey } from '../../util/theme/models';

const isBlurModuleLinked = (): boolean =>
  Boolean(requireOptionalNativeModule<object>('ExpoBlur'));

export type BlurColorScheme = 'light' | 'dark';

/**
 * The chrome family is what UIKit puts behind its own bars, so it reads as bar
 * material rather than as a panel dropped on top of one.
 */
export type BlurTint = 'systemChromeMaterialDark' | 'systemChromeMaterialLight';

/** Strength of the system material. Shared so every blurred surface matches. */
export const BLUR_INTENSITY = 100;

export interface UseBlurMaterialResult {
  isBlurAvailable: boolean;
  colorScheme: BlurColorScheme;
  /** The chrome material matching `colorScheme`, ready to pass to a BlurView. */
  tint: BlurTint;
}

export const useBlurMaterial = (): UseBlurMaterialResult => {
  const { themeAppearance } = useTheme();
  // Seeded from the session memory so a surface mounting after the first read
  // draws its blur on the first frame instead of after an async round trip.
  const [prefersReducedTransparency, setPrefersReducedTransparency] = useState<
    boolean | undefined
  >(getRememberedReduceTransparency);

  const [isModuleLinked] = useState(isBlurModuleLinked);
  const isSupportedPlatform = Platform.OS === 'ios' && isModuleLinked;

  useEffect(() => {
    if (!isSupportedPlatform) {
      return undefined;
    }

    let isActive = true;
    const remember = (enabled: boolean) => {
      rememberReduceTransparency(enabled);
      if (isActive) {
        setPrefersReducedTransparency(enabled);
      }
    };
    AccessibilityInfo.isReduceTransparencyEnabled().then(remember);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      remember,
    );

    return () => {
      isActive = false;
      subscription.remove();
    };
  }, [isSupportedPlatform]);

  const colorScheme: BlurColorScheme =
    themeAppearance === AppThemeKey.dark ? 'dark' : 'light';

  return {
    isBlurAvailable:
      isSupportedPlatform && prefersReducedTransparency === false,
    colorScheme,
    tint:
      colorScheme === 'dark'
        ? 'systemChromeMaterialDark'
        : 'systemChromeMaterialLight',
  };
};

export default useBlurMaterial;
