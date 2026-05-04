import { useCallback, useRef } from 'react';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';

/** Single-line wrapper around the analytics builder boilerplate. */
export const trackExploreEvent = (
  event: Parameters<typeof AnalyticsEventBuilder.createEventBuilder>[0],
  properties: Record<string, string>,
): void => {
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(event)
      .addProperties(properties)
      .build(),
  );
};

/**
 * Returns a stable `onScrollBeginDrag` handler that fires a one-shot analytics
 * event the first time the user begins scrolling.
 */
export const useScrollTracking = (
  interactionType: string,
  searchQuery: string,
  extraProperties?: Record<string, string>,
) => {
  const hasTracked = useRef(false);
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const extraPropsRef = useRef(extraProperties);
  extraPropsRef.current = extraProperties;

  const onScrollBeginDrag = useCallback(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;
    trackExploreEvent(MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED, {
      interaction_type: interactionType,
      search_query: searchQueryRef.current,
      ...extraPropsRef.current,
    });
  }, [interactionType]);

  const resetScrollTracking = useCallback(() => {
    hasTracked.current = false;
  }, []);

  return { onScrollBeginDrag, resetScrollTracking };
};
