import { useCallback } from 'react';
import { useAnalytics } from './useAnalytics/useAnalytics';
import {
  FILTER_EVENTS,
  type FilterClickedProperties,
} from '../../core/Analytics/events/filters';

/**
 * Returns a tracker for the generic `Filter Clicked` event (TMCU-837).
 *
 * Call it only from an explicit user interaction with a filter control — never
 * from a render or focus effect, since the event is defined as an interaction
 * signal rather than a state snapshot.
 *
 * Shared rather than Activity-specific so other surfaces can adopt the event by
 * passing their own `location` / `filter_type`.
 */
export const useTrackFilterClicked = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();

  return useCallback(
    (properties: FilterClickedProperties) => {
      trackEvent(
        createEventBuilder(FILTER_EVENTS.CLICKED)
          .addProperties(properties)
          .build(),
      );
    },
    [trackEvent, createEventBuilder],
  );
};
