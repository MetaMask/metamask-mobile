import { useMemo } from 'react';
import {
  IMetaMetricsEvent,
  JsonMap,
} from '../../../../core/Analytics/MetaMetrics.types';
import { useMetrics } from '../../../hooks/useMetrics';
import { CONFIRMATION_EVENTS } from '../../../../core/Analytics/events/confirmations';
import { useConfirmationLocation } from './useConfirmationLocation';

export function useConfirmationMetricEvents() {
  const { createEventBuilder, trackEvent } = useMetrics();
  const location = useConfirmationLocation();

  const events = useMemo(() => {
    const trackAdvancedDetailsToggledEvent = ({ isExpanded }: JsonMap) => {
      const event = generateEvent({
        createEventBuilder,
        metametricsEvent: CONFIRMATION_EVENTS.ADVANCED_DETAILS_CLICKED,
        properties: {
          location,
          is_expanded: isExpanded,
        },
      });

      trackEvent(event);
    };

    const trackTooltipClickedEvent = ({ tooltip }: JsonMap) => {
      const event = generateEvent({
        createEventBuilder,
        metametricsEvent: CONFIRMATION_EVENTS.TOOLTIP_CLICKED,
        properties: {
          location,
          tooltip,
        },
      });

      trackEvent(event);
    };

    const trackPageViewedEvent = () => {
      const event = generateEvent({
        createEventBuilder,
        metametricsEvent: CONFIRMATION_EVENTS.SCREEN_VIEWED,
        properties: {
          location,
        },
      });

      trackEvent(event);
    };

    return {
      trackAdvancedDetailsToggledEvent,
      trackTooltipClickedEvent,
      trackPageViewedEvent,
    };
  }, [createEventBuilder, location, trackEvent]);

  return { ...events };
}

function generateEvent({
  createEventBuilder,
  metametricsEvent,
  properties,
  sensitiveProperties,
}: {
  createEventBuilder: ReturnType<typeof useMetrics>['createEventBuilder'];
  metametricsEvent: IMetaMetricsEvent;
  properties?: JsonMap;
  sensitiveProperties?: JsonMap;
}) {
  return createEventBuilder(metametricsEvent)
    .addProperties(properties ?? {})
    .addSensitiveProperties(sensitiveProperties ?? {})
    .build();
}
