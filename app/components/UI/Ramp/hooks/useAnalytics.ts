import { useCallback } from 'react';
import { InteractionManager } from 'react-native';
import { AnalyticsEvents } from '../types';
import { AnonymousEvents } from '../constants';
import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';

export function trackEvent<T extends keyof AnalyticsEvents>(
  eventType: T,
  params: AnalyticsEvents[T],
) {
  const anonymous = AnonymousEvents.includes(eventType);
  const metrics = MetaMetrics.getInstance();
  const event = MetricsEventBuilder.createEventBuilder(
    MetaMetricsEvents[eventType],
  );

  InteractionManager.runAfterInteractions(() => {
    if (anonymous) {
      metrics.trackEvent(event.addSensitiveProperties({ ...params }).build());
    } else {
      metrics.trackEvent(event.addProperties({ ...params }).build());
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
