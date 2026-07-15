import { createContext, useContext } from 'react';
import type { HomeSectionName } from '../hooks/useHomeViewedEvent';

export const HomepageEntryPoints = {
  APP_OPENED: 'app_opened',
  HOME_TAB: 'home_tab',
  NAVIGATED_BACK: 'navigated_back',
} as const;

export type HomepageEntryPoint =
  (typeof HomepageEntryPoints)[keyof typeof HomepageEntryPoints];

interface HomepageScrollContextValue {
  /**
   * Register a callback to be invoked on every (throttled) scroll event.
   * Returns an unsubscribe function. Callbacks are called directly — no React
   * state is updated — so subscribing sections do NOT re-render on scroll.
   */
  subscribeToScroll: (callback: () => void) => () => void;
  /**
   * Height of the visible viewport (the ScrollView container), in pixels.
   */
  viewportHeight: number;
  /**
   * Absolute Y position of the scroll container's top edge on screen, in
   * pixels from the top of the device display (includes status bar, nav bar,
   * etc.). Used together with viewportHeight to form the correct visible
   * bounds when checking measureInWindow coordinates.
   */
  containerScreenY: number;
  /**
   * How the user arrived at the homepage for the current visit.
   */
  entryPoint: HomepageEntryPoint;
  /**
   * Increments every time the homepage screen receives focus. Sections use
   * this to reset their "has fired" state and re-fire on every visit.
   */
  visitId: number;
  /**
   * Called by each section immediately after its section_viewed event fires.
   * Tracks the section name for total count and the section index for depth.
   */
  notifySectionViewed: (
    sectionName: HomeSectionName,
    sectionIndex: number,
    /**
     * When true, updates visit and session max scroll depth. Pass false for
     * sections that fire without a viewport check (sectionRef === null) so that
     * non-rendered sections do not inflate depth metrics.
     */
    recordDepth: boolean,
  ) => void;
  /**
   * Returns the number of distinct sections viewed during the current visit.
   * Intended for use in the session_summary event fired on blur.
   */
  getViewedSectionCount: () => number;
  /**
   * Returns the maximum section index reached during the current visit.
   * Resets to -1 on each new homepage focus.
   */
  getVisitMaxDepth: () => number;
  /**
   * Ephemeral identifier for the current app launch. Generated once on app
   * start and never persisted. Groups all homepage visits within one session,
   * distinguishing "navigated away and back" from a fresh app launch.
   */
  appSessionId: string;
}

const noop = () => () => {
  // No-op
};

const defaultValue: HomepageScrollContextValue = {
  subscribeToScroll: noop,
  viewportHeight: 0,
  containerScreenY: 0,
  entryPoint: HomepageEntryPoints.APP_OPENED,
  visitId: 0,
  notifySectionViewed: () => undefined,
  getViewedSectionCount: () => 0,
  getVisitMaxDepth: () => -1,
  appSessionId: '',
};

export const HomepageScrollContext =
  createContext<HomepageScrollContextValue>(defaultValue);

export const useHomepageScrollContext = () => useContext(HomepageScrollContext);
