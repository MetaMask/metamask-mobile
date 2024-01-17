import { useCallback } from 'react';
import { InteractionManager } from 'react-native';
import Analytics from '../../../../../core/Analytics/Analytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { AnalyticsEvents } from '../types';

const AnonymousEvents: (keyof AnalyticsEvents)[] = [
  'RAMP_REGION_SELECTED',
  'RAMP_REGION_RESET',
  'ONRAMP_GET_STARTED_CLICKED',
  'ONRAMP_PAYMENT_METHOD_SELECTED',
  'ONRAMP_QUOTES_REQUESTED',
  'ONRAMP_QUOTES_RECEIVED',
  'ONRAMP_PROVIDER_SELECTED',
  'ONRAMP_PURCHASE_COMPLETED',
  'ONRAMP_PURCHASE_FAILED',
  'ONRAMP_PROVIDER_DETAILS_VIEWED',
  'ONRAMP_QUOTE_ERROR',

  'OFFRAMP_GET_STARTED_CLICKED',
  'OFFRAMP_PAYMENT_METHOD_SELECTED',
  'OFFRAMP_QUOTES_REQUESTED',
  'OFFRAMP_QUOTES_RECEIVED',
  'OFFRAMP_PROVIDER_SELECTED',
  'OFFRAMP_PURCHASE_COMPLETED',
  'OFFRAMP_PURCHASE_FAILED',
  'OFFRAMP_PROVIDER_DETAILS_VIEWED',
  'OFFRAMP_QUOTE_ERROR',

  'OFFRAMP_SEND_CRYPTO_PROMPT_VIEWED',
  'OFFRAMP_SEND_TRANSACTION_INVOKED',
  'OFFRAMP_SEND_TRANSACTION_CONFIRMED',
  'OFFRAMP_SEND_TRANSACTION_REJECTED',
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
