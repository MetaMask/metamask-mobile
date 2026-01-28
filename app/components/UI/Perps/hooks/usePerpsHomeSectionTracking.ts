import { useRef, useCallback } from 'react';
import { LayoutChangeEvent, NativeScrollEvent } from 'react-native';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../constants/eventNames';

/**
 * Section identifiers for home screen tracking
 * Maps to PerpsEventValues.SOURCE values for consistency
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
        return PerpsEventValues.SOURCE.PERPS_HOME_EXPLORE_CRYPTO;
      case 'explore_stocks':
        return PerpsEventValues.SOURCE.PERPS_HOME_EXPLORE_STOCKS;
      case 'activity':
        return PerpsEventValues.SOURCE.PERPS_HOME_ACTIVITY;
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
              [PerpsEventProperties.INTERACTION_TYPE]:
                PerpsEventValues.INTERACTION_TYPE.SLIDE,
              [PerpsEventProperties.SECTION_VIEWED]:
                getSectionSource(sectionId),
              [PerpsEventProperties.LOCATION]:
                PerpsEventValues.BUTTON_LOCATION.PERPS_HOME,
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
