import type { TransactionMeta } from '@metamask/transaction-controller';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';

import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { getSmartTransactionMetricsProperties } from '../../../../../util/smart-transactions';
import { MetaMetrics } from '../../../../Analytics';
import { MetricsEventBuilder } from '../../../../Analytics/MetricsEventBuilder';
import { BaseControllerMessenger } from '../../../types';
import { generateDefaultTransactionMetrics, generateEvent, generateRPCProperties } from '../utils';
import type { TransactionEventHandlerRequest } from '../types';
import Logger from '../../../../../util/Logger';
import { JsonMap } from '../../../../Analytics/MetaMetrics.types';

// Generic handler for simple transaction events
const createTransactionEventHandler =
  (eventType: (typeof TRANSACTION_EVENTS)[keyof typeof TRANSACTION_EVENTS]) =>
  (
    transactionMeta: TransactionMeta,
    transactionEventHandlerRequest: TransactionEventHandlerRequest,
  ) => {
    const defaultTransactionMetricProperties =
      generateDefaultTransactionMetrics(
        eventType,
        transactionMeta,
        transactionEventHandlerRequest,
      );

    // Create the event using the original format expected by tests
    const event = generateEvent({
      metametricsEvent: eventType,
      properties: defaultTransactionMetricProperties.properties as unknown as JsonMap,
      sensitiveProperties: defaultTransactionMetricProperties.sensitiveProperties,
    });

    MetaMetrics.getInstance().trackEvent(event);
  };

// Simple handlers - no unique properties / actions
export const handleTransactionAddedEventForMetrics = createTransactionEventHandler(
  TRANSACTION_EVENTS.TRANSACTION_ADDED,
);
export const handleTransactionApprovedEventForMetrics = createTransactionEventHandler(
  TRANSACTION_EVENTS.TRANSACTION_APPROVED,
);
export const handleTransactionRejectedEventForMetrics = createTransactionEventHandler(
  TRANSACTION_EVENTS.TRANSACTION_REJECTED,
);
export const handleTransactionSubmittedEventForMetrics = createTransactionEventHandler(
  TRANSACTION_EVENTS.TRANSACTION_SUBMITTED,
);

// Intentionally using TRANSACTION_FINALIZED for confirmed/failed/dropped transactions
// as unified type for all finalized transactions.
// Status could be derived from transactionMeta.status
export async function handleTransactionFinalizedEventForMetrics(
  transactionMeta: TransactionMeta,
  transactionEventHandlerRequest: TransactionEventHandlerRequest,
) {
  const { getState, initMessenger, smartTransactionsController } =
    transactionEventHandlerRequest;

  const defaultTransactionMetricProperties = generateDefaultTransactionMetrics(
    TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
    transactionMeta,
    transactionEventHandlerRequest,
  );

  // Create the event builder directly
  const eventBuilder = MetricsEventBuilder.createEventBuilder(
    TRANSACTION_EVENTS.TRANSACTION_FINALIZED
  );

  try {
    const shouldUseSmartTransaction = selectShouldUseSmartTransaction(
      getState(),
      transactionMeta.chainId,
    );

    // Add smart transaction properties if applicable
    if (shouldUseSmartTransaction) {
      const stxMetricsProperties = await getSmartTransactionMetricsProperties(
        smartTransactionsController,
        transactionMeta,
        true,
        initMessenger as unknown as BaseControllerMessenger,
      );
      eventBuilder.addProperties({
        smart_transaction_timed_out: stxMetricsProperties.smart_transaction_timed_out,
        smart_transaction_proxied: stxMetricsProperties.smart_transaction_proxied,
      } as unknown as JsonMap);
    }

    // Add RPC properties
    const rpcProperties = generateRPCProperties(transactionMeta.chainId);
    eventBuilder.addProperties(rpcProperties as unknown as JsonMap);

    // Add default properties
    eventBuilder.addProperties(
      defaultTransactionMetricProperties.properties as unknown as JsonMap
    );

    // Add sensitive properties
    eventBuilder.addSensitiveProperties(
      defaultTransactionMetricProperties.sensitiveProperties
    );
  } catch (error) {
    // If selector fails, continue without smart transaction metrics
    Logger.log('Error getting smart transaction metrics:', error);

    // Add RPC properties
    const rpcProperties = generateRPCProperties(transactionMeta.chainId);
    eventBuilder.addProperties(rpcProperties as unknown as JsonMap);

    // Add default properties if there was an error
    eventBuilder.addProperties(
      defaultTransactionMetricProperties.properties as unknown as JsonMap
    );

    // Add sensitive properties
    eventBuilder.addSensitiveProperties(
      defaultTransactionMetricProperties.sensitiveProperties
    );
  }

  const event = eventBuilder.build();
  MetaMetrics.getInstance().trackEvent(event);
}
