import React, { useEffect, useState } from 'react';
import type { NavigationState, PartialState } from '@react-navigation/native';

import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import { useHomeNavBarConfig } from '../../../Views/Homepage/hooks/useHomeNavBarConfig';
import { useIsNativeTabBar } from '../HomeTabs/useIsNativeTabBar';
import ContextualFooter from './ContextualFooter';
import ContextualHomeSectionOverlay from './ContextualHomeSectionOverlay';
import { setFooterHostActive } from './footerHostState';
import { useContextualNavState } from './contextualSection';

interface Focus {
  root: string;
  tab?: string;
}

const readFocus = (): Focus | null => {
  try {
    const root = NavigationService.navigation.getRootState();
    const top = root.routes[root.index ?? 0];
    if (!top) {
      return null;
    }
    const nested = top.state as
      | NavigationState
      | PartialState<NavigationState>
      | undefined;
    const tab = nested?.routes?.[nested.index ?? 0]?.name;
    return { root: top.name, tab: typeof tab === 'string' ? tab : undefined };
  } catch {
    return null;
  }
};

const FOOTER_ROOTS = new Set<string>([
  Routes.HOME_TABS,
  Routes.COLLECTIBLES_VIEW,
  Routes.BRIDGE.ROOT,
  Routes.PERPS.ROOT,
  Routes.PREDICT.ROOT,
  Routes.TRADE_HUB,
]);

/**
 * One footer above the root stack. It stays mounted across Trade, hubs, and
 * Collectibles, so the pill can animate when the set changes during a push.
 * It hides on every other route, including Settings and modals.
 */
const ContextualFooterHost = () => {
  const { isRefreshedNavBar } = useHomeNavBarConfig({ trackExposure: false });
  const isNativeTabBar = useIsNativeTabBar();
  const { section } = useContextualNavState();
  const [focus, setFocus] = useState<Focus | null>(null);
  const enabled = isRefreshedNavBar || isNativeTabBar;

  useEffect(() => {
    if (!enabled) {
      setFooterHostActive(false);
      return undefined;
    }
    let nav: { addListener?: (event: 'state', cb: () => void) => () => void };
    try {
      nav = NavigationService.navigation;
    } catch {
      setFooterHostActive(false);
      return undefined;
    }
    const update = () => {
      setFocus(readFocus());
    };
    update();
    setFooterHostActive(true);
    const unsubscribe = nav.addListener?.('state', update);
    return () => {
      setFooterHostActive(false);
      unsubscribe?.();
    };
  }, [enabled]);

  if (!enabled || focus === null || !FOOTER_ROOTS.has(focus.root)) {
    return null;
  }
  if (focus.root === Routes.HOME_TABS && focus.tab === Routes.BROWSER.HOME) {
    return null;
  }

  const homeRouteName = focus.root === Routes.HOME_TABS ? focus.tab : undefined;

  return (
    <>
      <ContextualHomeSectionOverlay />
      <ContextualFooter
        homeRouteName={homeRouteName}
        rootRouteName={focus.root}
      />
    </>
  );
};

export default ContextualFooterHost;
