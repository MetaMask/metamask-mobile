import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

import { useTheme } from '../../util/theme';
import { AppThemeKey } from '../../util/theme/models';

const isBlurModuleLinked = (): boolean =>
  Boolean(requireOptionalNativeModule<object>('ExpoBlur'));

export type BlurColorScheme = 'light' | 'dark';

export interface UseBlurMaterialResult {
  isBlurAvailable: boolean;
  colorScheme: BlurColorScheme;
}

export const useBlurMaterial = (): UseBlurMaterialResult => {
  const { themeAppearance } = useTheme();
  const [prefersReducedTransparency, setPrefersReducedTransparency] =
    useState(false);

  const [isModuleLinked] = useState(isBlurModuleLinked);
  const isSupportedPlatform = Platform.OS === 'ios' && isModuleLinked;

  useEffect(() => {
    if (!isSupportedPlatform) {
      return undefined;
    }

    let isActive = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then((enabled) => {
      if (isActive) {
        setPrefersReducedTransparency(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setPrefersReducedTransparency,
    );

    return () => {
      isActive = false;
      subscription.remove();
    };
  }, [isSupportedPlatform]);

  return {
    isBlurAvailable: isSupportedPlatform && !prefersReducedTransparency,
    colorScheme: themeAppearance === AppThemeKey.dark ? 'dark' : 'light',
  };
};

export default useBlurMaterial;
