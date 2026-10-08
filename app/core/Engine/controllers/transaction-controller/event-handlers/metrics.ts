import type { TransactionMeta } from '@metamask/transaction-controller';
import { merge } from 'lodash';
import { createProjectLogger } from '@metamask/utils';

import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { IMetaMetricsEvent } from '../../../../../util/analytics/analytics.types';
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
import { getSecurityAlertResponseProperties } from '../metrics_properties/security-alert-response';
import { getSwapTransactionActiveAbTestProperties } from '../metrics_properties/swap-transaction-ab-tests';
import { registerPendingTransactionActiveAbTestsForTransactionIds } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import {
  dropUnclaimedPrewarmTransaction,
  isUnclaimedPrewarmTransaction,
  stashUnclaimedPrewarmTransactionAdded,
  suppressUnclaimedPrewarmTransactionAdded,
} from '../../../../../components/UI/Perps/utils/unclaimedPrewarmTransactionMetrics';

const log = createProjectLogger('transaction-metrics');

const METRICS_BUILDERS: TransactionMetricsBuilder[] = [
  getBaseMetricsProperties,
  getBatchMetricsProperties,
  getGasMetricsProperties,
  getMetaMaskPayProperties,
  getSecurityAlertResponseProperties,
  getSimulationValuesProperties,
  getRPCMetricsProperties,
  getStxMetricsProperties,
  getHashMetricsProperties,
  getSwapTransactionActiveAbTestProperties,
];

interface CreateTransactionEventHandlerOptions {
  /**
   * Runs synchronously before async metric builders so pending side effects
   * (e.g. A/B attribution registration) cannot lose ordering vs. builders.
   */
  syncBeforeMetrics?: (transactionMeta: TransactionMeta) => void;
}

const createTransactionEventHandler =
  (
    eventType: (typeof TRANSACTION_EVENTS)[keyof typeof TRANSACTION_EVENTS],
    options?: CreateTransactionEventHandlerOptions,
  ) =>
  async (
    transactionMeta: TransactionMeta,
    transactionEventHandlerRequest: TransactionEventHandlerRequest,
  ) => {
    try {
      options?.syncBeforeMetrics?.(transactionMeta);
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
        .build();

      // Cast needed until @metamask/analytics-controller removes saveDataRecording from its AnalyticsTrackingEvent
      (
        transactionEventHandlerRequest.initMessenger as {
          call: (
            action: 'AnalyticsController:trackEvent',
            event: typeof analyticsEvent,
          ) => void;
        }
      ).call('AnalyticsController:trackEvent', analyticsEvent);
    } catch (error) {
      log('Error in transaction event handler', error);
    }
  };

const trackTransactionAddedEvent = createTransactionEventHandler(
  TRANSACTION_EVENTS.TRANSACTION_ADDED,
  {
    syncBeforeMetrics: (transactionMeta) => {
      if (transactionMeta.id) {
        registerPendingTransactionActiveAbTestsForTransactionIds([
          transactionMeta.id,
        ]);
      }
    },
  },
);

export const handleTransactionAddedEventForMetrics = (
  transactionMeta: TransactionMeta,
  transactionEventHandlerRequest: TransactionEventHandlerRequest,
) => {
  // An unclaimed deposit prewarm is not a user-started transaction. Hold Added
  // until claim; trackStashedPrewarmTransactionAdded emits this same handler.
  if (
    transactionMeta.id &&
    suppressUnclaimedPrewarmTransactionAdded(transactionMeta)
  ) {
    stashUnclaimedPrewarmTransactionAdded(transactionMeta.id, () =>
      trackTransactionAddedEvent(
        transactionMeta,
        transactionEventHandlerRequest,
      ),
    );
    return undefined;
  }
  return trackTransactionAddedEvent(
    transactionMeta,
    transactionEventHandlerRequest,
  );
};

export const handleTransactionApprovedEventForMetrics =
  createTransactionEventHandler(TRANSACTION_EVENTS.TRANSACTION_APPROVED);

const trackTransactionRejectedEvent = createTransactionEventHandler(
  TRANSACTION_EVENTS.TRANSACTION_REJECTED,
);

export const handleTransactionRejectedEventForMetrics = (
  transactionMeta: TransactionMeta,
  transactionEventHandlerRequest: TransactionEventHandlerRequest,
) => {
  if (transactionMeta.id && isUnclaimedPrewarmTransaction(transactionMeta.id)) {
    dropUnclaimedPrewarmTransaction(transactionMeta.id);
    return undefined;
  }
  return trackTransactionRejectedEvent(
    transactionMeta,
    transactionEventHandlerRequest,
  );
};

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
      .build();

    // Cast needed until @metamask/analytics-controller removes saveDataRecording from its AnalyticsTrackingEvent
    (
      transactionEventHandlerRequest.initMessenger as {
        call: (
          action: 'AnalyticsController:trackEvent',
          event: typeof analyticsEvent,
        ) => void;
      }
    ).call('AnalyticsController:trackEvent', analyticsEvent);
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
