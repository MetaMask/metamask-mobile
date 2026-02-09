import { useRef, useCallback } from 'react';
import { LayoutChangeEvent, NativeScrollEvent } from 'react-native';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '../constants/eventNames';

/**
 * Section identifiers for home screen tracking
 * Maps to PERPS_EVENT_VALUE.SOURCE values for consistency
 */
export type HomeSectionId = 'explore_crypto' | 'explore_stocks' | 'activity';

interface SectionPosition {
  top: number;
  height: number;
  tracked: boolean;
}

/**
 * Hook for tracking when users scroll to specific sections on the Perps home screen
 * Fires PERPS_UI_INTERACTION events when sections become visible through scrolling
 */
export function usePerpsHomeSectionTracking() {
  const { trackEvent, createEventBuilder } = useMetrics();

  // Track which sections have been viewed (to avoid duplicate events)
  const sectionPositions = useRef<Map<HomeSectionId, SectionPosition>>(
    new Map(),
  );

  // Threshold: consider section "viewed" when top 20% is visible
  const VISIBILITY_THRESHOLD = 0.2;

  /**
   * Handler for section layout to capture its position
   */
  const handleSectionLayout = useCallback(
    (sectionId: HomeSectionId) => (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      sectionPositions.current.set(sectionId, {
        top: y,
        height,
        tracked: sectionPositions.current.get(sectionId)?.tracked ?? false,
      });
    },
    [],
  );

  /**
   * Map section ID to source value for analytics
   */
  const getSectionSource = (sectionId: HomeSectionId): string => {
    switch (sectionId) {
      case 'explore_crypto':
        return PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_EXPLORE_CRYPTO;
      case 'explore_stocks':
        return PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_EXPLORE_STOCKS;
      case 'activity':
        return PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_ACTIVITY;
      default:
        return sectionId;
    }
  };

  /**
   * Track section viewed event
   */
  const trackSectionViewed = useCallback(
    (sectionId: HomeSectionId) => {
      const section = sectionPositions.current.get(sectionId);
      if (section && !section.tracked) {
        // Mark as tracked to prevent duplicate events
        sectionPositions.current.set(sectionId, { ...section, tracked: true });

        // Fire UI interaction event
        trackEvent(
          createEventBuilder(MetaMetricsEvents.PERPS_UI_INTERACTION)
            .addProperties({
              [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
                PERPS_EVENT_VALUE.INTERACTION_TYPE.SLIDE,
              [PERPS_EVENT_PROPERTY.SECTION_VIEWED]:
                getSectionSource(sectionId),
              [PERPS_EVENT_PROPERTY.LOCATION]:
                PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
            })
            .build(),
        );
      }
    },
    [trackEvent, createEventBuilder],
  );

  /**
   * Handler for scroll events to check section visibility
   */
  const handleScroll = useCallback(
    (event: { nativeEvent: NativeScrollEvent }) => {
      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      const scrollY = contentOffset.y;
      const viewportHeight = layoutMeasurement.height;
      const viewportBottom = scrollY + viewportHeight;

      // Check each section for visibility
      sectionPositions.current.forEach((section, sectionId) => {
        if (section.tracked) return; // Already tracked

        // Check if section top is within viewport (with threshold)
        const sectionVisibleThreshold =
          section.top + section.height * VISIBILITY_THRESHOLD;
        if (viewportBottom >= sectionVisibleThreshold) {
          trackSectionViewed(sectionId);
        }
      });
    },
    [trackSectionViewed],
  );

  /**
   * Reset tracking state (e.g., when navigating away and back)
   */
  const resetTracking = useCallback(() => {
    sectionPositions.current.forEach((section, sectionId) => {
      sectionPositions.current.set(sectionId, { ...section, tracked: false });
    });
  }, []);

  return {
    handleSectionLayout,
    handleScroll,
    resetTracking,
  };
}
