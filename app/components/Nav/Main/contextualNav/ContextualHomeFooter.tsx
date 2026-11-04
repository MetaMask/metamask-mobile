import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

import TabBarFloating, {
  type TabBarFloatingProps,
} from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating';
import Routes from '../../../../constants/navigation/Routes';
import ContextualMoneyTabBar from './ContextualMoneyTabBar';
import { getHomeFooterMode } from './contextualHomeFooterMode';
import {
  enterMoneySection,
  exitContextualSection,
  useContextualNavState,
} from './contextualSection';

export type ContextualHomeFooterProps = TabBarFloatingProps;

/**
 * Home floating footer: Home, Trending, Trade, Money, Social, with no circle.
 * Money replaces that pill in this same slot. Trading hubs and Collectibles
 * keep their own pushed screens. The swap is instant: it does not animate,
 * fetch, or blur.
 */
const ContextualHomeFooter = ({
  state,
  descriptors,
  navigation,
  onHeightChange,
}: ContextualHomeFooterProps) => {
  const { section } = useContextualNavState();
  const routeName = state.routes[state.index]?.name;
  const routeMode = getHomeFooterMode(routeName);
  const routeModeRef = useRef(routeMode);
  // The section wins so a Money press can swap the pill before the route
  // commits. The native bar never mounts this component; its chrome reads the
  // same store.
  const mode = section === 'money' ? 'money' : 'home';
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const onHeightChangeRef = useRef(onHeightChange);
  onHeightChangeRef.current = onHeightChange;

  useLayoutEffect(() => {
    const previousRouteMode = routeModeRef.current;
    routeModeRef.current = routeMode;

    if (routeMode === 'money') {
      if (section !== 'money') {
        enterMoneySection();
      }
      return;
    }
    // Only leave when the tab route itself returned Home. A press records the
    // section one frame before that route updates, and must not be cleared.
    if (
      previousRouteMode !== 'home' &&
      (section === 'money' || section === 'explore')
    ) {
      exitContextualSection();
    }
  }, [routeMode, section]);

  useEffect(
    () => () => {
      onHeightChangeRef.current?.(0);
    },
    [],
  );

  const handleHeightChange = useCallback((height: number) => {
    if (height === 0 && modeRef.current !== 'home') {
      return;
    }
    onHeightChangeRef.current?.(height);
  }, []);

  const handleHomePress = useCallback(() => {
    exitContextualSection();
    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET_VIEW,
    });
  }, [navigation]);

  useEffect(() => {
    if (mode === 'home') {
      return undefined;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleHomePress();
        return true;
      },
    );
    return () => subscription.remove();
  }, [handleHomePress, mode]);

  if (mode === 'money') {
    return (
      <ContextualMoneyTabBar
        onHomePress={handleHomePress}
        onHeightChange={handleHeightChange}
      />
    );
  }

  return (
    <TabBarFloating
      state={state}
      descriptors={descriptors}
      navigation={navigation}
      onHeightChange={handleHeightChange}
      trailingAction="none"
    />
  );
};

export default ContextualHomeFooter;
