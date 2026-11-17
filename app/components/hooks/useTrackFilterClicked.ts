import { useCallback } from 'react';
import { useAnalytics } from './useAnalytics/useAnalytics';
import {
  FILTER_EVENTS,
  type FilterClickedProperties,
} from '../../core/Analytics/events/filters';

/**
 * Tracks the generic `Filter Clicked` event, shared across surfaces via
 * `location` / `filter_type`.
 *
 * Call only from an explicit filter interaction, never from a render or focus
 * effect.
 *
 * @returns Callback that sends the event with the given properties.
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
