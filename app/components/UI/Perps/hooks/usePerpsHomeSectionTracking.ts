import { useRef, useCallback } from 'react';
import { LayoutChangeEvent, NativeScrollEvent } from 'react-native';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { usePerpsEventTracking } from './usePerpsEventTracking';

/**
 * Stable home section name, derived from the upstream SECTION_NAME enum.
 *
 * 'recently_added' is a local addition: the upstream @metamask/perps-controller
 * SECTION_NAME enum does not yet have a member for the "Recently added" rail.
 * Remove this union member once upstream adds one and use theirs instead.
 */
export type PerpsHomeSectionName =
  | (typeof PERPS_EVENT_VALUE.SECTION_NAME)[keyof typeof PERPS_EVENT_VALUE.SECTION_NAME]
  | 'recently_added';

/**
 * Ordered master list of all Perps home sections.
 * The render order in PerpsHomeView must match this array.
 * section_index = 1-based rank by y-position among registered sections.
 */
export const PERPS_HOME_SECTION_ORDER: PerpsHomeSectionName[] = [
  PERPS_EVENT_VALUE.SECTION_NAME.BALANCE,
  PERPS_EVENT_VALUE.SECTION_NAME.POSITIONS,
  PERPS_EVENT_VALUE.SECTION_NAME.ORDERS,
  PERPS_EVENT_VALUE.SECTION_NAME.WHATS_HAPPENING,
  PERPS_EVENT_VALUE.SECTION_NAME.WATCHLIST,
  PERPS_EVENT_VALUE.SECTION_NAME.PRODUCTS,
  PERPS_EVENT_VALUE.SECTION_NAME.TOP_MOVERS,
  'recently_added',
  PERPS_EVENT_VALUE.SECTION_NAME.EXPLORE_CRYPTO,
  PERPS_EVENT_VALUE.SECTION_NAME.EXPLORE_COMMODITIES,
  PERPS_EVENT_VALUE.SECTION_NAME.EXPLORE_STOCKS,
  PERPS_EVENT_VALUE.SECTION_NAME.EXPLORE_FOREX,
  PERPS_EVENT_VALUE.SECTION_NAME.RECENT_ACTIVITY,
];

interface SectionPosition {
  top: number;
  height: number;
  tracked: boolean;
}

/**
 * Computes the 1-based section_index for a given section based on its y-position
 * relative to all registered sections. Sections are ranked in ascending y order
 * (i.e., top-most visible section = index 1), which automatically reflects
 * the real on-screen order and handles A/B reordering.
 */
const computeSectionIndex = (
  sectionName: PerpsHomeSectionName,
  positions: Map<PerpsHomeSectionName, SectionPosition>,
): number => {
  const targetSection = positions.get(sectionName);
  if (!targetSection) return 0;

  const registeredSections = Array.from(positions.entries()).sort(
    ([, a], [, b]) => a.top - b.top,
  );
  const rank = registeredSections.findIndex(([name]) => name === sectionName);
  return rank + 1;
};

/**
 * Hook for tracking when users scroll to sections on the Perps home screen.
 *
 * On scroll-into-view each section emits two events:
 * 1. PERPS_UI_INTERACTION { interaction_type: slide } — existing slide event (kept)
 * 2. PERPS_SCREEN_VIEWED { screen_type: perps_home, section_name, section_index }
 * — per-section impression for A/B-test-safe engagement metrics
 *
 * section_index is computed dynamically from y-position rank among rendered sections,
 * so it reflects the real on-screen order regardless of A/B reordering or hidden sections.
 */
export function usePerpsHomeSectionTracking() {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { track } = usePerpsEventTracking();

  // Keyed by section name; stores layout and whether the impression has fired.
  const sectionPositions = useRef<Map<PerpsHomeSectionName, SectionPosition>>(
    new Map(),
  );

  // Threshold: consider section "viewed" when top 20% is visible
  const VISIBILITY_THRESHOLD = 0.2;

  /**
   * Handler for section layout to capture its y-position and height.
   * Call this from onLayout wrappers around each section container.
   *
   * Zero-height sections (e.g. a wrapper whose section renders null when empty)
   * are excluded from the registry entirely, so they neither emit impressions
   * nor participate in section_index ranking.
   */
  const handleSectionLayout = useCallback(
    (sectionName: PerpsHomeSectionName) => (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      if (height === 0) {
        sectionPositions.current.delete(sectionName);
        return;
      }
      sectionPositions.current.set(sectionName, {
        top: y,
        height,
        tracked: sectionPositions.current.get(sectionName)?.tracked ?? false,
      });
    },
    [],
  );

  /**
   * Fires both analytics events for a section becoming visible.
   */
  const trackSectionViewed = useCallback(
    (sectionName: PerpsHomeSectionName) => {
      const section = sectionPositions.current.get(sectionName);
      if (!section || section.tracked) return;

      sectionPositions.current.set(sectionName, { ...section, tracked: true });

      const sectionIndex = computeSectionIndex(
        sectionName,
        sectionPositions.current,
      );

      // 1. Existing slide event (kept for backward compatibility)
      trackEvent(
        createEventBuilder(MetaMetricsEvents.PERPS_UI_INTERACTION)
          .addProperties({
            [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
              PERPS_EVENT_VALUE.INTERACTION_TYPE.SLIDE,
            [PERPS_EVENT_PROPERTY.SECTION_VIEWED]: sectionName,
            [PERPS_EVENT_PROPERTY.LOCATION]:
              PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
          })
          .build(),
      );

      // 2. Per-section impression for section engagement metrics
      track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
          PERPS_EVENT_VALUE.SCREEN_TYPE.PERPS_HOME,
        [PERPS_EVENT_PROPERTY.SECTION_NAME]: sectionName,
        [PERPS_EVENT_PROPERTY.SECTION_INDEX]: sectionIndex,
      });
    },
    [trackEvent, createEventBuilder, track],
  );

  /**
   * Handler for scroll events to check section visibility.
   * Bridge from Reanimated worklet via useDiscoveryScrollManager.
   */
  const handleScroll = useCallback(
    (event: { nativeEvent: NativeScrollEvent }) => {
      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      const scrollY = contentOffset.y;
      const viewportHeight = layoutMeasurement.height;
      const viewportBottom = scrollY + viewportHeight;

      sectionPositions.current.forEach((section, sectionName) => {
        if (section.tracked) return;

        const sectionVisibleThreshold =
          section.top + section.height * VISIBILITY_THRESHOLD;
        if (viewportBottom >= sectionVisibleThreshold) {
          trackSectionViewed(sectionName);
        }
      });
    },
    [trackSectionViewed],
  );

  /**
   * Reset tracking state so sections can be re-tracked when the user
   * navigates away and back to the home screen.
   */
  const resetTracking = useCallback(() => {
    sectionPositions.current.forEach((section, sectionName) => {
      sectionPositions.current.set(sectionName, { ...section, tracked: false });
    });
  }, []);

  return {
    handleSectionLayout,
    handleScroll,
    resetTracking,
  };
}
