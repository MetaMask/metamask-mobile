import { useCallback } from 'react';
import { AnalyticsEvents as AggregatorEvents } from '../Aggregator/types';
import { AnalyticsEvents as DepositEvents } from '../Deposit/types';

// Import directly from source files to avoid circular dependency
import MetaMetrics from '../../../../core/Analytics/MetaMetrics';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';

interface MergedRampEvents extends AggregatorEvents, DepositEvents {}

export function trackEvent<T extends keyof MergedRampEvents>(
  eventType: T,
  params: MergedRampEvents[T],
) {
  const metrics = MetaMetrics.getInstance();
  metrics.trackEvent(
    MetricsEventBuilder.createEventBuilder(MetaMetricsEvents[eventType])
      .addProperties({ ...params })
      .build(),
  );
}

function useAnalytics() {
  return useCallback(
    <T extends keyof MergedRampEvents>(
      eventType: T,
      params: MergedRampEvents[T],
    ) => {
      trackEvent(eventType, params);
    },
    [],
  );
}

export default useAnalytics;
