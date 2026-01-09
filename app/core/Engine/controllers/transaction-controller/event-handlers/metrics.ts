import type { TransactionMeta } from '@metamask/transaction-controller';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { createProjectLogger } from '@metamask/utils';

import { MetaMetrics } from '../../../../Analytics';
import {
  generateEvent,
  getBuilderMetrics,
  retryIfEngineNotInitialized,
} from '../utils';
import type {
  TransactionEventHandlerRequest,
  TransactionMetricsBuilder,
} from '../types';
import { getDefaultMetricsProperties } from '../event_properties/default';
import { getMetaMaskPayProperties } from '../event_properties/metamask-pay';
import { getSimulationValuesProperties } from '../event_properties/simulation-values';
import { getRPCMetricsProperties } from '../event_properties/rpc';
import { getStxMetricsProperties } from '../event_properties/stx';
import { getHashMetricsProperties } from '../event_properties/hash';

const log = createProjectLogger('transaction-metrics');

const METRICS_BUILDERS: TransactionMetricsBuilder[] = [
  getDefaultMetricsProperties,
  getMetaMaskPayProperties,
  getSimulationValuesProperties,
  getRPCMetricsProperties,
  getStxMetricsProperties,
  getHashMetricsProperties,
];

const createTransactionEventHandler =
  (eventType: (typeof TRANSACTION_EVENTS)[keyof typeof TRANSACTION_EVENTS]) =>
  async (
    transactionMeta: TransactionMeta,
    transactionEventHandlerRequest: TransactionEventHandlerRequest,
  ) => {
    try {
      const metrics = await getBuilderMetrics({
        builders: METRICS_BUILDERS,
        eventType,
        request: transactionEventHandlerRequest,
        transactionMeta,
      });

      const event = generateEvent({
        metametricsEvent: eventType,
        ...metrics,
      });

      log('Event', event);

      MetaMetrics.getInstance().trackEvent(event);
    } catch (error) {
      log('Error in transaction event handler', error);
    }
  };

export const handleTransactionAddedEventForMetrics =
  createTransactionEventHandler(TRANSACTION_EVENTS.TRANSACTION_ADDED);

export const handleTransactionApprovedEventForMetrics =
  createTransactionEventHandler(TRANSACTION_EVENTS.TRANSACTION_APPROVED);

export const handleTransactionRejectedEventForMetrics =
  createTransactionEventHandler(TRANSACTION_EVENTS.TRANSACTION_REJECTED);

export const handleTransactionSubmittedEventForMetrics =
  createTransactionEventHandler(TRANSACTION_EVENTS.TRANSACTION_SUBMITTED);

export async function handleTransactionFinalizedEventForMetrics(
  transactionMeta: TransactionMeta,
  transactionEventHandlerRequest: TransactionEventHandlerRequest,
): Promise<void> {
  try {
    if (
      retryIfEngineNotInitialized(() => {
        handleTransactionFinalizedEventForMetrics(
          transactionMeta,
          transactionEventHandlerRequest,
        );
      })
    ) {
      return;
    }

    const eventType = TRANSACTION_EVENTS.TRANSACTION_FINALIZED;

    const metrics = await getBuilderMetrics({
      builders: METRICS_BUILDERS,
      eventType,
      request: transactionEventHandlerRequest,
      transactionMeta,
    });

    const event = generateEvent({
      metametricsEvent: eventType,
      ...metrics,
    });

    log('Finalized event', event);

    MetaMetrics.getInstance().trackEvent(event);
  } catch (error) {
    log('Error in finalized transaction event handler', error);
  }
}
