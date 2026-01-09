import { createProjectLogger } from '@metamask/utils';

import { MetricsEventBuilder } from '../../../Analytics/MetricsEventBuilder';
import {
  JsonMap,
  IMetaMetricsEvent,
} from '../../../Analytics/MetaMetrics.types';
import { TRANSACTION_EVENTS } from '../../../Analytics/events/confirmations';
import Engine from '../../Engine';

const log = createProjectLogger('transaction-metrics');

export function isFinalizedEvent(eventType: IMetaMetricsEvent): boolean {
  return (
    eventType.category === TRANSACTION_EVENTS.TRANSACTION_FINALIZED.category
  );
}

export function generateEvent({
  metametricsEvent,
  properties,
  sensitiveProperties,
}: {
  metametricsEvent: IMetaMetricsEvent;
  properties?: JsonMap;
  sensitiveProperties?: JsonMap;
}) {
  return MetricsEventBuilder.createEventBuilder(metametricsEvent)
    .addProperties(properties ?? {})
    .addSensitiveProperties(sensitiveProperties ?? {})
    .build();
}

export function retryIfEngineNotInitialized(fn: () => void): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { context } = Engine;
    return false;
  } catch (e) {
    log('Transaction controller event before engine initialized');

    setTimeout(() => {
      fn();
    }, 5000);

    return true;
  }
}
