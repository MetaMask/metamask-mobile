import { useMemo } from 'react';
import { JsonMap } from '../../../../core/Analytics/MetaMetrics.types';
import { useMetrics } from '../../../hooks/useMetrics';
import {
  MetaMetricsEvents,
  IMetaMetricsEvent,
} from '../../../../core/Analytics';

export function useConfirmationMetricEvents() {
  const { createEventBuilder, trackEvent } = useMetrics();

  const events = useMemo(() => {
    const trackAdvancedDetailsToggledEvent = ({ location }: JsonMap) => {
      const event = generateEvent({
        createEventBuilder,
        metametricsEvent:
          MetaMetricsEvents.CONFIRMATION_ADVANCED_DETAILS_CLICKED,
        properties: {
          location,
        },
      });

      trackEvent(event);
    };

    const trackTooltipClickedEvent = ({ location, tooltip }: JsonMap) => {
      const event = generateEvent({
        createEventBuilder,
        metametricsEvent: MetaMetricsEvents.CONFIRMATION_TOOLTIP_CLICKED,
        properties: {
          location,
          tooltip,
        },
      });

      trackEvent(event);
    };

    const trackPageViewedEvent = ({ location }: JsonMap) => {
      const event = generateEvent({
        createEventBuilder,
        metametricsEvent: MetaMetricsEvents.CONFIRMATION_PAGE_VIEWED,
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
  }, [createEventBuilder, trackEvent]);

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
