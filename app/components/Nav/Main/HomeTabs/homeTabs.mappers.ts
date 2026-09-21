import type { NativeBottomTabNavigationOptions } from '@react-navigation/bottom-tabs/unstable';
import type { NavigationState, PartialState } from '@react-navigation/native';

import Routes from '../../../../constants/navigation/Routes';
import Device from '../../../../util/device';
import { strings } from '../../../../../locales/i18n';
import { LABEL_BY_TAB_BAR_ICON_KEY } from '../../../../component-library/components/Navigation/TabBar/TabBar.constants';
import type {
  ExtendedBottomTabNavigationOptions,
  TabBarIconKey,
} from '../../../../component-library/components/Navigation/TabBar/TabBar.types';
import type { HomeTabDefinition, HomeTabRoute } from './homeTabs.types';

export const isNativeTabBarSupported = (): boolean =>
  Device.isIos() && Device.comparePlatformVersionTo('26') >= 0;

/**
 * Stable identities: a new style object makes the native bar re-apply its
 * `UITabBarAppearance`, which drops Liquid Glass.
 */
export const TAB_BAR_VISIBLE_STYLE: NativeBottomTabNavigationOptions['tabBarStyle'] =
  { display: 'flex' };
export const TAB_BAR_HIDDEN_STYLE: NativeBottomTabNavigationOptions['tabBarStyle'] =
  { display: 'none' };

/** Not `Routes.EXPLORE_SEARCH`, which must keep resolving to the root stack. */
export const SEARCH_TAB_NAME = 'SearchTab';
export const TRADE_TAB_NAME = 'TradeTab';

type NestedState = NavigationState | PartialState<NavigationState> | undefined;

const activeRouteName = (state: NestedState): string | undefined =>
  state?.routes?.[state.index ?? state.routes.length - 1]?.name;

export const shouldHideRewardsTabBar = (route: HomeTabRoute): boolean => {
  const rewardsViewRoute = route.state?.routes?.find(
    (nestedRoute) => nestedRoute.name === Routes.REWARDS_VIEW,
  );
  const active = activeRouteName(rewardsViewRoute?.state);
  return !(
    !active ||
    active === Routes.REWARDS_DASHBOARD ||
    active === Routes.REWARDS_ONBOARDING_FLOW
  );
};

export interface JsTabOptionsDeps {
  /** Omitted for `TabBar`, which fires the Navigation Drawer event itself. */
  trackBottomNavPress?: (iconKey: TabBarIconKey) => void;
}

export const toJsTabOptions = (
  tab: HomeTabDefinition,
  { trackBottomNavPress }: JsTabOptionsDeps = {},
): ExtendedBottomTabNavigationOptions => ({
  tabBarIconKey: tab.iconKey,
  rootScreenName: tab.rootScreenName,
  callback: () => {
    trackBottomNavPress?.(tab.iconKey);
    tab.onPress?.();
  },
  ...(tab.onLeave ? { onLeave: tab.onLeave } : null),
  ...(tab.isHidden ? { isHidden: true } : null),
  ...(tab.isSelected ? { isSelected: tab.isSelected } : null),
  ...(tab.freezeOnBlur === undefined
    ? null
    : { freezeOnBlur: tab.freezeOnBlur }),
});

export const toNativeTabOptions = (
  tab: HomeTabDefinition,
  route?: HomeTabRoute,
): NativeBottomTabNavigationOptions => {
  const { nativeIcon } = tab;
  const isHidden = route ? (tab.hidesTabBarFor?.(route) ?? false) : false;
  return {
    title: strings(LABEL_BY_TAB_BAR_ICON_KEY[tab.iconKey]),
    ...(nativeIcon
      ? {
          tabBarIcon: ({ focused }: { focused: boolean }) => ({
            type: 'image',
            source: focused ? nativeIcon.selectedSource : nativeIcon.source,
            tinted: true,
          }),
        }
      : null),
    // Only set when hiding, so the shared style identity survives otherwise.
    ...(isHidden ? { tabBarStyle: TAB_BAR_HIDDEN_STYLE } : null),
  };
};
