import type { TransactionMeta } from '@metamask/transaction-controller';
import { merge } from 'lodash';
import { createProjectLogger } from '@metamask/utils';

import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { IMetaMetricsEvent } from '../../../../Analytics/MetaMetrics.types';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';
import { generateEvent, retryIfEngineNotInitialized } from '../utils';
import type {
  TransactionEventHandlerRequest,
  TransactionMetrics,
  TransactionMetricsBuilder,
} from '../types';
import { EMPTY_METRICS } from '../constants';
import { getBaseMetricsProperties } from '../metrics_properties/base';
import { getMetaMaskPayProperties } from '../metrics_properties/metamask-pay';
import { getSimulationValuesProperties } from '../metrics_properties/simulation-values';
import { getRPCMetricsProperties } from '../metrics_properties/rpc';
import { getStxMetricsProperties } from '../metrics_properties/stx';
import { getHashMetricsProperties } from '../metrics_properties/hash';
import { getBatchMetricsProperties } from '../metrics_properties/batch';
import { getGasMetricsProperties } from '../metrics_properties/gas';

const log = createProjectLogger('transaction-metrics');

const METRICS_BUILDERS: TransactionMetricsBuilder[] = [
  getBaseMetricsProperties,
  getBatchMetricsProperties,
  getGasMetricsProperties,
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

      // Convert ITrackingEvent to AnalyticsTrackingEvent and track
      const analyticsEvent = AnalyticsEventBuilder.createEventBuilder(
        event.name,
      )
        .addProperties(event.properties)
        .addSensitiveProperties(event.sensitiveProperties)
        .setSaveDataRecording(event.saveDataRecording)
        .build();

      transactionEventHandlerRequest.initMessenger.call(
        'AnalyticsController:trackEvent',
        analyticsEvent,
      );
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

// Intentionally using TRANSACTION_FINALIZED for confirmed/failed/dropped transactions
// as unified type for all finalized transactions.
// Status could be derived from transactionMeta.status
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

    // Convert ITrackingEvent to AnalyticsTrackingEvent and track
    const analyticsEvent = AnalyticsEventBuilder.createEventBuilder(event.name)
      .addProperties(event.properties)
      .addSensitiveProperties(event.sensitiveProperties)
      .setSaveDataRecording(event.saveDataRecording)
      .build();

    transactionEventHandlerRequest.initMessenger.call(
      'AnalyticsController:trackEvent',
      analyticsEvent,
    );
  } catch (error) {
    log('Error in finalized transaction event handler', error);
  }
}

function getConfirmationMetrics(
  state: ReturnType<TransactionEventHandlerRequest['getState']>,
  transactionId: string,
): TransactionMetrics {
  return (state?.confirmationMetrics?.metricsById?.[transactionId] ||
    {}) as unknown as TransactionMetrics;
}

async function getBuilderMetrics({
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

  const getUIMetrics = (transactionId: string): TransactionMetrics =>
    getConfirmationMetrics(getState(), transactionId);

  const builderResults = await Promise.all(
    builders.map(async (builder) => {
      try {
        return await builder({
          eventType,
          transactionMeta,
          allTransactions,
          getUIMetrics,
          getState,
          initMessenger: request.initMessenger,
          smartTransactionsController: request.smartTransactionsController,
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
