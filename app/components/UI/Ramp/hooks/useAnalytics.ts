import { useCallback } from 'react';
import { AnalyticsEvents as AggregatorEvents } from '../Aggregator/types';
import { AnalyticsEvents as DepositEvents } from '../Deposit/types';

import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
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
