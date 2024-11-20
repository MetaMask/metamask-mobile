import { useCallback } from 'react';
import { InteractionManager } from 'react-native';
import { AnalyticsEvents } from '../types';
import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';

const AnonymousEvents: (keyof AnalyticsEvents)[] = [];

export function trackEvent<T extends keyof AnalyticsEvents>(
  eventType: T,
  params: AnalyticsEvents[T],
) {
  const metrics = MetaMetrics.getInstance();
  const event = MetaMetricsEvents[eventType];
  const anonymous = AnonymousEvents.includes(eventType);
  InteractionManager.runAfterInteractions(() => {
    if (anonymous) {
      metrics.trackEvent(event, {
        sensitiveProperties: { ...params },
      });
    } else {
      metrics.trackEvent(event, {
        ...params,
      });
    }
  });
}

function useAnalytics() {
  return useCallback(
    <T extends keyof AnalyticsEvents>(
      eventType: T,
      params: AnalyticsEvents[T],
    ) => {
      trackEvent(eventType, params);
    },
    [],
  );
}

export default useAnalytics;
