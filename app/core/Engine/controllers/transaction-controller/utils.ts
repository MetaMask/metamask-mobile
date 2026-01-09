import type { TransactionMeta } from '@metamask/transaction-controller';
import { merge } from 'lodash';
import { createProjectLogger } from '@metamask/utils';

import { MetricsEventBuilder } from '../../../Analytics/MetricsEventBuilder';
import {
  JsonMap,
  IMetaMetricsEvent,
} from '../../../Analytics/MetaMetrics.types';
import { TRANSACTION_EVENTS } from '../../../Analytics/events/confirmations';
import type {
  TransactionEventHandlerRequest,
  TransactionMetricsBuilder,
} from './types';
import { EMPTY_METRICS } from './constants';
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

export async function getBuilderMetrics({
  builders,
  eventType,
  request,
  transactionMeta,
}: {
  builders: TransactionMetricsBuilder[];
  eventType: IMetaMetricsEvent;
  request: TransactionEventHandlerRequest;
  transactionMeta: TransactionMeta;
}) {
  const metrics = {
    properties: {},
    sensitiveProperties: {},
  };

  const allTransactions =
    request.getState()?.engine?.backgroundState?.TransactionController
      ?.transactions ?? [];

  const getState = request.getState;

  const builderResults = await Promise.all(
    builders.map(async (builder) => {
      try {
        return await builder({
          eventType,
          transactionMeta,
          allTransactions,
          getUIMetrics: () => EMPTY_METRICS,
          getState,
          transactionEventHandlerRequest: request,
        });
      } catch (error) {
        return EMPTY_METRICS;
      }
    }),
  );

  for (const currentMetrics of builderResults) {
    merge(metrics, currentMetrics);
  }

  return metrics;
}
