import { useCallback } from 'react';
import { AnalyticsEvents } from '../types';
import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';

export function trackEvent<T extends keyof AnalyticsEvents>(
  eventType: T,
  params: AnalyticsEvents[T],
) {
  const metrics = MetaMetrics.getInstance();
  metrics.trackEvent(MetricsEventBuilder.createEventBuilder(
      MetaMetricsEvents[eventType],
  )
      .addProperties({ ...params })
      .build()
  );
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
