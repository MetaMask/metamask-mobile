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
   * Used to aggregate the total number of distinct sections viewed this visit.
   */
  notifySectionViewed: (sectionName: HomeSectionName) => void;
  /**
   * Returns the number of distinct sections viewed during the current visit.
   * Intended for use in the session_summary event fired on blur.
   */
  getViewedSectionCount: () => number;
  /**
   * Call before navigating to a detail screen (e.g. Asset) from within the
   * homepage. Sets a flag so the next blur does NOT fire the session_summary
   * "Home Viewed" event.
   */
  skipNextSessionSummary: () => void;
  /**
   * Reads (and resets) the skip flag. Returns `true` if the upcoming
   * session_summary should be suppressed.
   */
  shouldSkipSessionSummary: () => boolean;
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
  skipNextSessionSummary: () => undefined,
  shouldSkipSessionSummary: () => false,
};

export const HomepageScrollContext =
  createContext<HomepageScrollContextValue>(defaultValue);

export const useHomepageScrollContext = () => useContext(HomepageScrollContext);
