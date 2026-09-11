import { createContext, useContext } from 'react';

/**
 * Height that `TabBarFloating` overlays at the bottom of a tab scene. Scroll
 * views add it as content padding so their last row stays reachable while
 * content still shows through behind the bar.
 *
 * 0 whenever the floating bar is absent — the control arm, and the cases where
 * the navigator hides the bar (browser, keyboard open).
 */
export const FloatingTabBarInsetContext = createContext(0);

export const useFloatingTabBarInset = () =>
  useContext(FloatingTabBarInsetContext);
