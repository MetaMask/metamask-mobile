import { useLayoutEffect, useState } from 'react';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import type {
  NativeStackHeaderItem,
  NativeStackNavigationOptions,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

import { useTheme } from '../../../util/theme';

export interface NativeHeaderConfig {
  /** Must be referentially stable (`useCallback`); a new function re-applies the bar. */
  leftItems?: () => NativeStackHeaderItem[];
  /** Must be referentially stable (`useCallback`); a new function re-applies the bar. */
  rightItems?: () => NativeStackHeaderItem[];
  /** Per-screen gate, e.g. a feature flag, on top of OS support. */
  isEnabled?: boolean;
}

/** Compact UINavigationBar height, below the status bar. */
export const NATIVE_HEADER_BAR_HEIGHT = 44;

const HIDDEN_HEADER_OPTIONS: NativeStackNavigationOptions = {
  headerShown: false,
  headerTransparent: false,
  unstable_headerLeftItems: undefined,
  unstable_headerRightItems: undefined,
};

/**
 * Whether screens hand their header to UIKit. Only iOS 26 draws the native bar
 * with Liquid Glass; everywhere else screens keep their JS header.
 */
export const useIsNativeHeader = (): boolean => {
  const [isSupported] = useState(isLiquidGlassAvailable);
  return isSupported;
};

/**
 * Shows the native iOS 26 bar with the given items on a screen whose navigator
 * hides the header by default. The bar is transparent, so UIKit draws the glass
 * items and the scroll edge effect over the content. Returns whether the native
 * header is on, so the caller can skip its JS header.
 */
export const useNativeHeader = ({
  leftItems,
  rightItems,
  isEnabled = true,
}: NativeHeaderConfig = {}): boolean => {
  const isNativeHeader = useIsNativeHeader() && isEnabled;
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { colors } = useTheme();

  useLayoutEffect(() => {
    if (!isNativeHeader) {
      return;
    }
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerShadowVisible: false,
      headerTintColor: colors.icon.default,
      // An empty title stops react-navigation printing the route name.
      title: '',
      unstable_headerLeftItems: leftItems,
      unstable_headerRightItems: rightItems,
    });
  }, [isNativeHeader, navigation, colors.icon.default, leftItems, rightItems]);

  useLayoutEffect(() => {
    if (!isNativeHeader) {
      return;
    }
    return () => navigation.setOptions(HIDDEN_HEADER_OPTIONS);
  }, [isNativeHeader, navigation]);

  return isNativeHeader;
};
