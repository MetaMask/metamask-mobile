import type { AppleIcon } from 'react-native-bottom-tabs';
import type { NativeBottomTabNavigationOptions } from '@bottom-tabs/react-navigation';

import { strings } from '../../../../../locales/i18n';
import { TabBarIconKey } from '../TabBar/TabBar.types';
import { LABEL_BY_TAB_BAR_ICON_KEY } from '../TabBar/TabBar.constants';

type NativeTabSymbol = AppleIcon['sfSymbol'];

interface NativeTabSymbols {
  symbol: NativeTabSymbol;
  /** Selected-state glyph. Keys without a filled variant reuse the outline. */
  focusedSymbol?: NativeTabSymbol;
}

/**
 * SF Symbols standing in for the design-system glyphs. The native bar takes
 * images or symbols, not components, so the DS icon set can't be used directly.
 */
export const NATIVE_TAB_SYMBOL_BY_ICON_KEY: Record<
  TabBarIconKey,
  NativeTabSymbols
> = {
  [TabBarIconKey.Wallet]: { symbol: 'house', focusedSymbol: 'house.fill' },
  [TabBarIconKey.Browser]: { symbol: 'safari', focusedSymbol: 'safari.fill' },
  [TabBarIconKey.Trending]: { symbol: 'chart.line.uptrend.xyaxis' },
  [TabBarIconKey.Money]: {
    symbol: 'dollarsign.circle',
    focusedSymbol: 'dollarsign.circle.fill',
  },
  [TabBarIconKey.Social]: {
    symbol: 'person.2',
    focusedSymbol: 'person.2.fill',
  },
  [TabBarIconKey.Activity]: { symbol: 'clock', focusedSymbol: 'clock.fill' },
  [TabBarIconKey.Rewards]: { symbol: 'gift', focusedSymbol: 'gift.fill' },
  [TabBarIconKey.Trade]: { symbol: 'plus' },
  [TabBarIconKey.Actions]: { symbol: 'arrow.up.arrow.down' },
  [TabBarIconKey.Setting]: {
    symbol: 'gearshape',
    focusedSymbol: 'gearshape.fill',
  },
};

/**
 * Route name of the search tab. Distinct from `Routes.EXPLORE_SEARCH`, which is
 * the same screen registered on the root stack; a nested navigator must not
 * reuse a parent's route name.
 */
export const NATIVE_SEARCH_TAB_ROUTE = 'ExploreSearchTab';

/**
 * iOS 26: the bar shrinks to the selected tab as content scrolls down and
 * grows back on scroll up, as in Apple Music. `never` keeps it full-size.
 */
export const NATIVE_TAB_BAR_MINIMIZE_BEHAVIOR = 'onScrollDown' as const;

/** Native screen options for a tab, keyed the same way as the JS bars. */
export const nativeTabOptions = (
  key: TabBarIconKey,
): NativeBottomTabNavigationOptions => {
  const { symbol, focusedSymbol } = NATIVE_TAB_SYMBOL_BY_ICON_KEY[key];
  const labelKey = LABEL_BY_TAB_BAR_ICON_KEY[key];

  return {
    tabBarIcon: ({ focused }) => ({
      sfSymbol: focused ? (focusedSymbol ?? symbol) : symbol,
    }),
    tabBarLabel: labelKey ? strings(labelKey) : undefined,
    // Same key scheme as the JS bars so e2e selectors work across arms.
    tabBarButtonTestID: `tab-bar-item-${key}`,
  };
};

/**
 * The search tab. On iOS 26 a search-role tab is rendered as the detached
 * circle beside the pill, which is the floating bar's search button.
 */
export const nativeSearchTabOptions = (): NativeBottomTabNavigationOptions => ({
  role: 'search',
  tabBarIcon: () => ({ sfSymbol: 'magnifyingglass' }),
  tabBarLabel: strings('wallet.search_accessibility_label'),
  tabBarButtonTestID: 'tab-bar-item-Search',
});
