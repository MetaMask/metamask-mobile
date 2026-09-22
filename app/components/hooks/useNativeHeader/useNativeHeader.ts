import { useLayoutEffect, useMemo, useState } from 'react';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import type {
  NativeStackHeaderItem,
  NativeStackNavigationOptions,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
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
}

/**
 * Whether screens hand their header to UIKit. Only iOS 26 draws the native bar
 * with Liquid Glass; everywhere else screens keep their JS header.
 */
export const useIsNativeHeader = (): boolean => {
  const isEnabled = useSelector(selectNativeHeaderEnabled);
  const [isSupported] = useState(isLiquidGlassAvailable);

  return isEnabled && isSupported;
};

const HIDDEN_HEADER_OPTIONS: NativeStackNavigationOptions = {
  headerShown: false,
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
}: NativeHeaderConfig = {}): boolean => {
  const isNativeHeader = useIsNativeHeader();
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
