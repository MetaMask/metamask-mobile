import type { TransactionMeta } from '@metamask/transaction-controller';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';

import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { getSmartTransactionMetricsProperties } from '../../../../../util/smart-transactions';
import { MetaMetrics } from '../../../../Analytics';
import { MetricsEventBuilder } from '../../../../Analytics/MetricsEventBuilder';
import { BaseControllerMessenger } from '../../../types';
import { generateDefaultTransactionMetrics, generateEvent } from '../utils';
import type { TransactionEventHandlerRequest } from '../types';
import Logger from '../../../../../util/Logger';
import { JsonMap } from '../../../../Analytics/MetaMetrics.types';
import { extractRpcDomain, getNetworkRpcUrl } from '../../../../../util/rpc-domain-utils';

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

    // Only log for TRANSACTION_SUBMITTED events
    if (eventType === TRANSACTION_EVENTS.TRANSACTION_SUBMITTED) {
      Logger.log('SENDING METRICS EVENT (SUBMITTED):', JSON.stringify({
        event: event.name,
        properties: event.properties,
        has_rpc_domain: event.properties?.rpc_domain !== undefined,
        rpc_domain: event.properties?.rpc_domain,
      }));
    }

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
    // Get RPC domain for the transaction
    const rpcUrl = getNetworkRpcUrl(transactionMeta.chainId);
    const rpcDomain = extractRpcDomain(rpcUrl);
    if (rpcDomain) {
      eventBuilder.addProperties({ rpc_domain: rpcDomain } as unknown as JsonMap);
    }

    const shouldUseSmartTransaction = selectShouldUseSmartTransaction(
      getState(),
      transactionMeta.chainId,
    );

    // First, add the smart transaction properties if applicable
    if (shouldUseSmartTransaction) {
      const stxMetricsProperties = await getSmartTransactionMetricsProperties(
        smartTransactionsController,
        transactionMeta,
        true,
        initMessenger as unknown as BaseControllerMessenger,
      );

      // Add the STX properties as a separate call
      // This is what the test is expecting
      eventBuilder.addProperties({
        smart_transaction_timed_out: stxMetricsProperties.smart_transaction_timed_out,
        smart_transaction_proxied: stxMetricsProperties.smart_transaction_proxied,
      } as unknown as JsonMap);
    }

    // Then add the default properties
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
