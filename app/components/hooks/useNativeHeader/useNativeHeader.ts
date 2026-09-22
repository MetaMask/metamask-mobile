import { useLayoutEffect, useMemo, useState } from 'react';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import type {
  NativeStackHeaderItem,
  NativeStackNavigationOptions,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import { selectNativeHeaderEnabled } from '../../../selectors/featureFlagController/nativeHeader';
import { useTheme } from '../../../util/theme';

export interface NativeHeaderConfig {
  title?: string;
  /** Must be referentially stable (`useCallback`); a new function re-applies the bar. */
  leftItems?: () => NativeStackHeaderItem[];
  /** Must be referentially stable (`useCallback`); a new function re-applies the bar. */
  rightItems?: () => NativeStackHeaderItem[];
  searchBarOptions?: NativeStackNavigationOptions['headerSearchBarOptions'];
  isLargeTitle?: boolean;
  isBackButtonHidden?: boolean;
  /** False when the component is embedded in another screen rather than routed. */
  isEnabled?: boolean;
}

/**
 * Whether screens hand their header to UIKit. Only iOS 26 draws the native bar
 * with Liquid Glass; everywhere else screens keep their JS header.
 */
export const useIsNativeHeader = (): boolean => {
  const [isSupported] = useState(isLiquidGlassAvailable);

  // The flag is only read where the OS can draw glass, so unsupported
  // platforms (and minimal test stores) never touch remote-flag state.
  const isFlagEnabled = useSelector(
    (state: Parameters<typeof selectNativeHeaderEnabled>[0]) =>
      isSupported && selectNativeHeaderEnabled(state),
  );

  return isSupported && isFlagEnabled === true;
};

const HIDDEN_HEADER_OPTIONS: NativeStackNavigationOptions = {
  headerShown: false,
};

/** Compact UINavigationBar height; a large-title bar is taller. */
const NATIVE_HEADER_BAR_HEIGHT = 44;

/**
 * Top padding for a screen whose root is not a `ScrollView`. Scroll views inset
 * themselves under the transparent bar via `contentInsetAdjustmentBehavior`.
 */
export const useNativeHeaderInset = (): number => {
  const isNativeHeader = useIsNativeHeader();
  const insets = useSafeAreaInsets();

  return isNativeHeader ? insets.top + NATIVE_HEADER_BAR_HEIGHT : 0;
};

/**
 * Navigator-level chrome for a flow adopting the native header. Spread into the
 * navigator's `screenOptions` so the bar exists from the first frame; a bar
 * switched on from inside a screen fades in mid-push instead of morphing.
 */
export const useNativeHeaderScreenOptions =
  (): NativeStackNavigationOptions => {
    const isNativeHeader = useIsNativeHeader();
    const { colors } = useTheme();
    const tw = useTailwind();

    return useMemo(() => {
      if (!isNativeHeader) {
        return HIDDEN_HEADER_OPTIONS;
      }
      const { fontFamily, fontSize } = tw.style(
        'text-heading-sm font-default-bold',
      );

      return {
        headerShown: true,
        // Transparent is what makes UIKit draw the glass material and let content
        // pass underneath; an opaque bar gets a flat `colors.card` fill instead.
        headerTransparent: true,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: colors.icon.default,
        headerTitleStyle: {
          color: colors.text.default,
          fontFamily: typeof fontFamily === 'string' ? fontFamily : undefined,
          fontSize: typeof fontSize === 'number' ? fontSize : undefined,
        },
      };
    }, [isNativeHeader, colors.icon.default, colors.text.default, tw]);
  };

/**
 * A screen's own title and bar items. Returns whether the native header is on,
 * so the caller can skip rendering its JS header.
 */
export const useNativeHeader = ({
  title,
  leftItems,
  rightItems,
  searchBarOptions,
  isLargeTitle = false,
  isBackButtonHidden = false,
  isEnabled = true,
}: NativeHeaderConfig = {}): boolean => {
  const isNativeHeader = useIsNativeHeader() && isEnabled;
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();

  useLayoutEffect(() => {
    if (!isNativeHeader) {
      return;
    }
    navigation.setOptions({
      // An empty title stops react-navigation printing the route name.
      title: title ?? '',
      unstable_headerLeftItems: leftItems,
      unstable_headerRightItems: rightItems,
      headerSearchBarOptions: searchBarOptions,
      headerLargeTitle: isLargeTitle,
      headerBackVisible: !isBackButtonHidden,
    });
  }, [
    isNativeHeader,
    navigation,
    title,
    leftItems,
    rightItems,
    searchBarOptions,
    isLargeTitle,
    isBackButtonHidden,
  ]);

  return isNativeHeader;
};
