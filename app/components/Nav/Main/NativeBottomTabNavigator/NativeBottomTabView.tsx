import { CommonActions, useTheme } from '@react-navigation/native';
import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  type ColorValue,
  type NativeSyntheticEvent,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import {
  Tabs,
  type TabSelectedEvent,
  type TabSelectionRejectedEvent,
} from 'react-native-screens';

import { useTheme as useAppTheme } from '../../../../util/theme';
import type {
  NativeBottomTabNavigationOptions,
  NativeBottomTabViewProps,
  NativeTabBarIcon,
} from './types';

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

interface ConfirmedState {
  routeKey: string;
  provenance: number;
}

interface NativeState {
  lastTransition: { from: string; to: string } | null;
  confirmed: ConfirmedState;
}

type NativeAction =
  | { type: 'CLEAR_TRANSITION'; to: string }
  | {
      type: 'TRACK_TRANSITION';
      confirmed: ConfirmedState;
      lastTransition: NonNullable<NativeState['lastTransition']>;
    }
  | { type: 'CONFIRM_STATE'; confirmed: ConfirmedState };

interface TabSelectionPreventedEvent {
  selectedScreenKey: string;
  provenance: number;
  preventedScreenKey: string;
}

const ICON_SIZE = Platform.select({ ios: 25, default: 24 });

function getTabTitle(
  options: NativeBottomTabNavigationOptions,
  routeName: string,
): string {
  const { tabBarLabel, title } = options;
  if (typeof tabBarLabel === 'string') {
    return tabBarLabel;
  }
  if (typeof title === 'string') {
    return title;
  }
  return routeName;
}

function reducer(state: NativeState, action: NativeAction): NativeState {
  switch (action.type) {
    case 'TRACK_TRANSITION':
      return {
        ...state,
        lastTransition: action.lastTransition,
        confirmed: action.confirmed,
      };
    case 'CLEAR_TRANSITION':
      return state.lastTransition?.to === action.to
        ? { ...state, lastTransition: null }
        : state;
    case 'CONFIRM_STATE':
      return state.confirmed.routeKey === action.confirmed.routeKey &&
        state.confirmed.provenance === action.confirmed.provenance
        ? state
        : { ...state, confirmed: action.confirmed };
    default:
      return state;
  }
}

function resolvePlatformIcon(icon: NativeTabBarIcon | undefined) {
  if (!icon) {
    return undefined;
  }

  if ('ios' in icon || 'android' in icon) {
    return {
      ios: icon.ios,
      android: icon.android,
    };
  }

  if (icon.type === 'sfSymbol') {
    return { ios: icon, android: undefined };
  }

  return { ios: icon, android: icon };
}

function getIconFromOptions(
  options: NativeBottomTabNavigationOptions,
  focused: boolean,
  activeTintColor: ColorValue,
  inactiveTintColor: ColorValue,
): NativeTabBarIcon | undefined {
  const { tabBarIcon } = options;
  if (!tabBarIcon) {
    return undefined;
  }

  if (typeof tabBarIcon === 'function') {
    return tabBarIcon({
      focused,
      size: ICON_SIZE ?? 24,
      color: focused ? activeTintColor : inactiveTintColor,
    });
  }

  return tabBarIcon;
}

/**
 * Renders bottom tabs with platform-native UITabBarController / BottomNavigationView
 * via react-native-screens Tabs API.
 */
export default function NativeBottomTabView({
  state,
  navigation,
  descriptors,
}: NativeBottomTabViewProps) {
  const { colors } = useTheme();
  const { colors: appColors, themeAppearance } = useAppTheme();
  const focusedRoute = state.routes[state.index];

  if (focusedRoute == null) {
    throw new Error(`Couldn't find a route at index ${state.index}.`);
  }

  const focusedRouteKey = focusedRoute.key;
  const [loaded, setLoaded] = React.useState([focusedRouteKey]);

  if (!loaded.includes(focusedRouteKey)) {
    setLoaded([...loaded, focusedRouteKey]);
  }

  const [nativeState, dispatch] = useReducer(reducer, {
    lastTransition: null,
    confirmed: {
      routeKey: focusedRouteKey,
      provenance: 0,
    },
  });

  const previousRouteKeyRef = useRef(focusedRouteKey);

  useEffect(() => {
    previousRouteKeyRef.current = focusedRouteKey;
    const timer = setTimeout(() => {
      dispatch({ type: 'CLEAR_TRANSITION', to: focusedRouteKey });
    }, 32);
    return () => clearTimeout(timer);
  }, [focusedRouteKey]);

  const navigateToRoute = useCallback(
    (route: (typeof state.routes)[number], confirmed: ConfirmedState) => {
      dispatch({
        type: 'TRACK_TRANSITION',
        confirmed,
        lastTransition: {
          from: previousRouteKeyRef.current,
          to: route.key,
        },
      });

      navigation.dispatch({
        ...CommonActions.navigate(route.name, route.params),
        target: state.key,
      });
    },
    [navigation, state],
  );

  const onTabSelected = useCallback(
    (event: NativeSyntheticEvent<TabSelectedEvent>) => {
      const { selectedScreenKey, provenance, actionOrigin } = event.nativeEvent;
      const confirmed = { routeKey: selectedScreenKey, provenance };
      const route = state.routes.find((r) => r.key === selectedScreenKey);

      if (!route) {
        return;
      }

      if (actionOrigin === 'user') {
        const pressEvent = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });

        if (pressEvent.defaultPrevented) {
          return;
        }
      }

      if (actionOrigin === 'programmatic-js' || focusedRouteKey === route.key) {
        dispatch({ type: 'CONFIRM_STATE', confirmed });
        return;
      }

      navigateToRoute(route, confirmed);
    },
    [focusedRouteKey, navigateToRoute, navigation, state.routes],
  );

  const onTabSelectionRejected = useCallback(
    (event: NativeSyntheticEvent<TabSelectionRejectedEvent>) => {
      const { selectedScreenKey, provenance } = event.nativeEvent;
      const confirmed = { routeKey: selectedScreenKey, provenance };
      const route = state.routes.find((r) => r.key === selectedScreenKey);

      if (!route) {
        return;
      }

      if (focusedRouteKey === route.key) {
        dispatch({ type: 'CONFIRM_STATE', confirmed });
        return;
      }

      navigateToRoute(route, confirmed);
    },
    [focusedRouteKey, navigateToRoute, state.routes],
  );

  const onTabSelectionPrevented = useCallback(
    (event: NativeSyntheticEvent<TabSelectionPreventedEvent>) => {
      const { selectedScreenKey, provenance, preventedScreenKey } =
        event.nativeEvent;

      dispatch({
        type: 'CONFIRM_STATE',
        confirmed: { routeKey: selectedScreenKey, provenance },
      });

      navigation.emit({
        type: 'tabPress',
        target: preventedScreenKey,
        canPreventDefault: true,
      });
    },
    [navigation],
  );

  const currentOptions = descriptors[focusedRouteKey]?.options ?? {};
  const shouldHideTabBar =
    // @ts-expect-error display is valid on ViewStyle used for tabBarStyle
    currentOptions.tabBarStyle?.display === 'none';
  const activeTintColor = currentOptions.tabBarActiveTintColor ?? colors.text;
  const inactiveTintColor =
    currentOptions.tabBarInactiveTintColor ?? colors.text;
  // Prefer screen option, then MetaMask theme — never RN's transparent nav background.
  const backgroundColor =
    // @ts-expect-error backgroundColor exists on ViewStyle
    currentOptions.tabBarStyle?.backgroundColor ?? appColors.background.default;

  const androidAppearance = {
    tabBarBackgroundColor: backgroundColor,
    normal: {
      tabBarItemTitleFontColor: inactiveTintColor,
      tabBarItemIconColor: inactiveTintColor,
    },
    selected: {
      tabBarItemTitleFontColor: activeTintColor,
      tabBarItemIconColor: activeTintColor,
    },
  };

  // Solid fill + no blur. scrollEdgeAppearance mirrors standard so UIKit
  // doesn't switch to a transparent scroll-edge variant. (Ignored on iOS 26+.)
  const iosAppearance = {
    tabBarBackgroundColor: backgroundColor,
    tabBarBlurEffect: 'none' as const,
    stacked: {
      normal: {
        tabBarItemTitleFontColor: inactiveTintColor,
        tabBarItemIconColor: inactiveTintColor,
      },
      selected: {
        tabBarItemTitleFontColor: activeTintColor,
        tabBarItemIconColor: activeTintColor,
      },
    },
  };

  return (
    <View style={styles.flex}>
      <Tabs.Host
        navStateRequest={{
          selectedScreenKey: focusedRouteKey,
          baseProvenance: nativeState.confirmed.provenance,
        }}
        rejectStaleNavStateUpdates
        onTabSelected={onTabSelected}
        onTabSelectionRejected={onTabSelectionRejected}
        onTabSelectionPrevented={onTabSelectionPrevented}
        tabBarHidden={Boolean(shouldHideTabBar)}
        colorScheme={themeAppearance === 'dark' ? 'dark' : 'light'}
        nativeContainerStyle={{ backgroundColor }}
        ios={{
          tabBarTintColor: activeTintColor,
          tabBarMinimizeBehavior: 'onScrollDown',
        }}
      >
        {state.routes.map((route) => {
          const descriptor = descriptors[route.key];
          if (!descriptor) {
            throw new Error(
              `Couldn't find a descriptor for route '${route.key}'.`,
            );
          }

          const { options, render } = descriptor;
          const isFocused = state.index === state.routes.indexOf(route);
          const {
            lazy = true,
            tabBarSelectionEnabled,
            tabBarBadge,
            tabBarAccessibilityLabel,
            tabBarTestID,
            tabBarButtonTestID,
          } = options;

          const tabTitle = getTabTitle(options, route.name);

          const icon = resolvePlatformIcon(
            getIconFromOptions(
              options,
              false,
              activeTintColor,
              inactiveTintColor,
            ),
          );
          const selectedIcon = resolvePlatformIcon(
            getIconFromOptions(
              options,
              true,
              activeTintColor,
              inactiveTintColor,
            ),
          );

          const shouldRender =
            !lazy ||
            isFocused ||
            loaded.includes(route.key) ||
            nativeState.lastTransition?.from === route.key ||
            nativeState.lastTransition?.to === route.key;

          return (
            <Tabs.Screen
              key={route.key}
              screenKey={route.key}
              title={tabTitle}
              badgeValue={tabBarBadge != null ? String(tabBarBadge) : undefined}
              preventNativeSelection={tabBarSelectionEnabled === false}
              tabBarItemAccessibilityLabel={tabBarAccessibilityLabel}
              tabBarItemTestID={tabBarButtonTestID ?? tabBarTestID}
              specialEffects={{
                repeatedTabSelection: {
                  popToRoot: true,
                  scrollToTop: true,
                },
              }}
              android={{
                icon: icon?.android,
                selectedIcon: selectedIcon?.android,
                standardAppearance: androidAppearance,
              }}
              ios={{
                icon: icon?.ios,
                selectedIcon: selectedIcon?.ios,
                standardAppearance: iosAppearance,
                scrollEdgeAppearance: iosAppearance,
              }}
            >
              <View style={styles.flex} collapsable={false}>
                {shouldRender ? render() : null}
              </View>
            </Tabs.Screen>
          );
        })}
      </Tabs.Host>
    </View>
  );
}
