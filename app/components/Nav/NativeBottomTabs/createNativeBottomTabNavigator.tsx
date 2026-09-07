/**
 * EXPERIMENTAL — a react-navigation navigator backed by the platform-native
 * tab bar (`UITabBarController` on iOS) via react-native-screens' `Tabs`.
 *
 * Why a real navigator rather than rendering `Tabs.Host` directly: react
 * navigation permits exactly one navigator per screen container. Rendering the
 * tab stacks as plain children of `Tabs.Host` throws "Another navigator is
 * already registered for this container". Going through `descriptor.render()`
 * gives each screen its own container, which is what makes nesting legal — and
 * keeps route registration, deeplinks, root modals and `navigation.navigate()`
 * working unchanged.
 *
 * Deliberately consumes the same `options` shape as the custom JS `TabBar`
 * (`tabBarIconKey`, `callback`, `onLeave`, `isHidden`) so swapping it in is a
 * one-line change in MainNavigator.
 *
 * The underlying screens tabs API is marked EXPERIMENTAL upstream and may
 * change without notice.
 */
import React, { useCallback, useRef } from 'react';
import {
  createNavigatorFactory,
  TabActions,
  TabRouter,
  useNavigationBuilder,
  type NavigationHelpers,
  type ParamListBase,
  type TabActionHelpers,
  type TabNavigationState,
  type TabRouterOptions,
} from '@react-navigation/native';
import { Tabs, type PlatformIconIOS } from 'react-native-screens';
import type { NativeSyntheticEvent } from 'react-native';

import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import {
  LABEL_BY_TAB_BAR_ICON_KEY,
  // eslint-disable-next-line import-x/no-namespace
} from '../../../component-library/components/Navigation/TabBar/TabBar.constants';
import { TabBarIconKey } from '../../../component-library/components/Navigation/TabBar/TabBar.types';
import foxFilledTemplate from './assets/metamask-fox-filled.png';

/**
 * Icon per tab. SF Symbols where Apple's vocabulary fits; a MetaMask template
 * image where brand identity matters more than platform convention.
 *
 * Home uses the fox from the design system's `metamask-fox-filled.svg` (a
 * single monochrome path), pre-rasterised to PNG at @1x/@2x/@3x. Two reasons
 * it can't be used directly: native tab items accept only SF Symbols,
 * xcassets or template images — never the design-system `Icon` React
 * components — and SVGs in this repo compile to components anyway (`svg` sits
 * in metro's `sourceExts`, not `assetExts`), so an SVG is not a valid image
 * source here.
 *
 * `templateSource` makes iOS render it from the alpha channel and tint it with
 * `tabBarTintColor`, exactly like an SF Symbol — so it inherits the
 * selected/unselected states and the iOS 26 Liquid Glass glow for free.
 * Regenerate with scripts/generate-native-tab-icons.mjs if the SVG changes.
 */
const ICON_BY_TAB_BAR_ICON_KEY: Partial<
  Record<TabBarIconKey, { icon: PlatformIconIOS; selectedIcon?: PlatformIconIOS }>
> = {
  [TabBarIconKey.Wallet]: {
    icon: { type: 'templateSource', templateSource: foxFilledTemplate },
  },
  [TabBarIconKey.Trending]: {
    icon: { type: 'sfSymbol', name: 'chart.line.uptrend.xyaxis' },
  },
  [TabBarIconKey.Browser]: {
    icon: { type: 'sfSymbol', name: 'safari' },
    selectedIcon: { type: 'sfSymbol', name: 'safari.fill' },
  },
  [TabBarIconKey.Money]: {
    icon: { type: 'sfSymbol', name: 'dollarsign.circle' },
    selectedIcon: { type: 'sfSymbol', name: 'dollarsign.circle.fill' },
  },
  [TabBarIconKey.Social]: {
    icon: { type: 'sfSymbol', name: 'person.2' },
    selectedIcon: { type: 'sfSymbol', name: 'person.2.fill' },
  },
  [TabBarIconKey.Activity]: {
    icon: { type: 'sfSymbol', name: 'clock' },
    selectedIcon: { type: 'sfSymbol', name: 'clock.fill' },
  },
  [TabBarIconKey.Rewards]: {
    icon: { type: 'sfSymbol', name: 'gift' },
    selectedIcon: { type: 'sfSymbol', name: 'gift.fill' },
  },
  [TabBarIconKey.Trade]: {
    icon: { type: 'sfSymbol', name: 'arrow.left.arrow.right' },
  },
  [TabBarIconKey.Setting]: {
    icon: { type: 'sfSymbol', name: 'gearshape' },
    selectedIcon: { type: 'sfSymbol', name: 'gearshape.fill' },
  },
};

export interface NativeBottomTabNavigationOptions {
  /** Same key the custom JS TabBar uses, so `options` objects are reusable. */
  tabBarIconKey?: TabBarIconKey;
  /** Fired on tab press — preserves the custom TabBar's per-tab analytics. */
  callback?: () => void;
  /** Fired on the *previous* tab when leaving it. */
  onLeave?: () => void;
  /** Keeps the route registered but out of the tab bar (e.g. Browser). */
  isHidden?: boolean;
  /** Retained for parity with the JS TabBar options; unused natively. */
  rootScreenName?: string;
}

interface TabSelectedNativeEvent {
  selectedScreenKey: string;
  provenance: number;
  isRepeated: boolean;
}

interface NativeBottomTabViewProps {
  state: TabNavigationState<ParamListBase>;
  navigation: NavigationHelpers<ParamListBase>;
  descriptors: Record<
    string,
    {
      options: NativeBottomTabNavigationOptions;
      render: () => React.ReactNode;
    }
  >;
}

const NativeBottomTabView = ({
  state,
  descriptors,
  navigation,
}: NativeBottomTabViewProps) => {
  // Provenance of the last navigation state acknowledged by the native side.
  // Tabs.Host uses it to reject stale JS-originated updates.
  const provenanceRef = useRef(0);
  const { colors } = useTheme();

  const visibleRoutes = state.routes.filter(
    (route) => !descriptors[route.key]?.options?.isHidden,
  );

  const focusedRoute = state.routes[state.index];
  // If the focused route is hidden from the bar (e.g. Browser), keep the
  // native selection on the first visible tab rather than sending it a key
  // it has no item for.
  const selectedScreenKey = descriptors[focusedRoute?.key]?.options?.isHidden
    ? visibleRoutes[0]?.key
    : focusedRoute?.key;

  const handleTabSelected = useCallback(
    (event: NativeSyntheticEvent<TabSelectedNativeEvent>) => {
      const { selectedScreenKey: nextKey, provenance } = event.nativeEvent;
      provenanceRef.current = provenance;

      const nextRoute = state.routes.find((route) => route.key === nextKey);
      if (!nextRoute) {
        return;
      }

      const previousRoute = state.routes[state.index];
      if (previousRoute && previousRoute.key !== nextRoute.key) {
        descriptors[previousRoute.key]?.options?.onLeave?.();
      }

      descriptors[nextRoute.key]?.options?.callback?.();

      if (previousRoute?.key !== nextRoute.key) {
        navigation.dispatch({
          ...TabActions.jumpTo(nextRoute.name),
          target: state.key,
        });
      }
    },
    [state, descriptors, navigation],
  );

  return (
    <Tabs.Host
      navStateRequest={{
        selectedScreenKey,
        baseProvenance: provenanceRef.current,
      }}
      onTabSelected={handleTabSelected}
      ios={{
        tabBarMinimizeBehavior: 'onScrollDown',
        // Matches the custom JS TabBar's active treatment (icon.default)
        // rather than leaving iOS's default blue. On iOS 26 this also tints
        // the Liquid Glass selection glow.
        tabBarTintColor: colors.icon.default,
      }}
    >
      {visibleRoutes.map((route) => {
        const descriptor = descriptors[route.key];
        const iconKey = descriptor.options.tabBarIconKey;
        const icons = iconKey ? ICON_BY_TAB_BAR_ICON_KEY[iconKey] : undefined;
        const labelKey = iconKey
          ? LABEL_BY_TAB_BAR_ICON_KEY[iconKey]
          : undefined;

        return (
          <Tabs.Screen
            key={route.key}
            screenKey={route.key}
            title={labelKey ? strings(labelKey) : ''}
            // Preserves the `tab-bar-item-*` selectors the E2E suites use.
            tabBarItemTestID={`tab-bar-item-${iconKey}`}
            ios={
              icons
                ? {
                    icon: icons.icon,
                    ...(icons.selectedIcon
                      ? { selectedIcon: icons.selectedIcon }
                      : {}),
                  }
                : undefined
            }
          >
            {descriptor.render()}
          </Tabs.Screen>
        );
      })}
    </Tabs.Host>
  );
};

/**
 * `layout` / `screenLayout` / `screenListeners` are intentionally not exposed:
 * MainNavigator does not use them, and typing them correctly pulls in a large
 * slice of react-navigation's generics for no benefit at this stage.
 * `tabBar` is accepted-and-ignored so the same JSX works for both navigators.
 */
interface NativeBottomTabNavigatorProps {
  id?: string;
  initialRouteName?: string;
  backBehavior?: TabRouterOptions['backBehavior'];
  children: React.ReactNode;
  screenOptions?: NativeBottomTabNavigationOptions;
  tabBar?: unknown;
}

function NativeBottomTabNavigator({
  id,
  initialRouteName,
  backBehavior,
  children,
  screenOptions,
}: NativeBottomTabNavigatorProps) {
  const { state, descriptors, navigation, NavigationContent } =
    useNavigationBuilder<
      TabNavigationState<ParamListBase>,
      TabRouterOptions,
      TabActionHelpers<ParamListBase>,
      NativeBottomTabNavigationOptions,
      Record<string, never>
    >(TabRouter, {
      id,
      initialRouteName,
      backBehavior,
      children,
      screenOptions,
    });

  return (
    <NavigationContent>
      <NativeBottomTabView
        state={state}
        navigation={navigation}
        descriptors={descriptors}
      />
    </NavigationContent>
  );
}

export const createNativeBottomTabNavigator = () =>
  createNavigatorFactory(NativeBottomTabNavigator)();

export default createNativeBottomTabNavigator;
