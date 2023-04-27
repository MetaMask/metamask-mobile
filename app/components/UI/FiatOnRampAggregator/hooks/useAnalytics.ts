import { useCallback } from 'react';
import { InteractionManager } from 'react-native';
import Analytics from '../../../../core/Analytics/Analytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { AnalyticsEvents } from '../types';

const AnonymousEvents: (keyof AnalyticsEvents)[] = [
  'ONRAMP_REGION_SELECTED',
  'ONRAMP_REGION_RESET',
  'ONRAMP_PAYMENT_METHOD_SELECTED',
  'ONRAMP_QUOTES_REQUESTED',
  'ONRAMP_QUOTES_RECEIVED',
  'ONRAMP_PROVIDER_SELECTED',
  'ONRAMP_PURCHASE_COMPLETED',
  'ONRAMP_PURCHASE_FAILED',
  'ONRAMP_PROVIDER_DETAILS_VIEWED',
  'ONRAMP_QUOTE_ERROR',
];

export function trackEvent<T extends keyof AnalyticsEvents>(
  eventType: T,
  params: AnalyticsEvents[T],
) {
  const event = MetaMetricsEvents[eventType];
  const anonymous = AnonymousEvents.includes(eventType);

  InteractionManager.runAfterInteractions(() => {
    if (anonymous) {
      Analytics.trackEventWithParameters(event, {});
      Analytics.trackEventWithParameters(event, params, true);
    } else {
      Analytics.trackEventWithParameters(event, params);
    }
  });
}

function useAnalytics() {
  const trackEventHook = useCallback(
    <T extends keyof AnalyticsEvents>(
      eventType: T,
      params: AnalyticsEvents[T],
    ) => {
      trackEvent(eventType, params);
    },
    [],
  );

  return trackEventHook;
}

export default useAnalytics;
