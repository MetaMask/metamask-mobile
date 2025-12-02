import { useCallback } from 'react';
import { AnalyticsEvents as AggregatorEvents } from '../Aggregator/types';
import { AnalyticsEvents as DepositEvents } from '../Deposit/types';

import { analytics } from '../../../../core/Analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../core/Analytics/AnalyticsEventBuilder';
import { EVENT_NAME } from '../../../../core/Analytics';

interface MergedRampEvents extends AggregatorEvents, DepositEvents {}

export function trackEvent<T extends keyof MergedRampEvents>(
  eventType: T,
  params: MergedRampEvents[T],
) {
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(EVENT_NAME[eventType])
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
