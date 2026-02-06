import { useCallback } from 'react';
import { AnalyticsEvents as AggregatorEvents } from '../Aggregator/types';
import { AnalyticsEvents as DepositEvents } from '../Deposit/types';

import { MetaMetricsEvents } from '../../../../core/Analytics';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';

interface MergedRampEvents extends AggregatorEvents, DepositEvents {}

export function trackEvent<T extends keyof MergedRampEvents>(
  eventType: T,
  params: MergedRampEvents[T],
) {
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(MetaMetricsEvents[eventType])
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
