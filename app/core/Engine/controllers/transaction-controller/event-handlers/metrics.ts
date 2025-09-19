import type { TransactionMeta } from '@metamask/transaction-controller';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { merge } from 'lodash';

import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { getSmartTransactionMetricsProperties } from '../../../../../util/smart-transactions';
import { MetaMetrics } from '../../../../Analytics';
import { BaseControllerMessenger } from '../../../types';
import {
  generateDefaultTransactionMetrics,
  generateEvent,
  generateRPCProperties,
  getConfirmationMetricProperties,
} from '../utils';
import type {
  TransactionEventHandlerRequest,
  TransactionMetricsBuilder,
} from '../types';
import Logger from '../../../../../util/Logger';
import { getMetaMaskPayProperties } from '../event_properties/metamask-pay';

const METRICS_BUILDERS: TransactionMetricsBuilder[] = [
  getMetaMaskPayProperties,
];

// Generic handler for simple transaction events
const createTransactionEventHandler =
  (eventType: (typeof TRANSACTION_EVENTS)[keyof typeof TRANSACTION_EVENTS]) =>
  async (
    transactionMeta: TransactionMeta,
    transactionEventHandlerRequest: TransactionEventHandlerRequest,
  ) => {
    const defaultTransactionMetricProperties =
      await generateDefaultTransactionMetrics(
        eventType,
        transactionMeta,
        transactionEventHandlerRequest,
      );

    const metrics = {
      properties: defaultTransactionMetricProperties.properties,
      sensitiveProperties:
        defaultTransactionMetricProperties.sensitiveProperties,
    };

    const allTransactions =
      transactionEventHandlerRequest.getState()?.engine?.backgroundState
        ?.TransactionController?.transactions ?? [];

    const getUIMetrics = getConfirmationMetricProperties.bind(
      null,
      transactionEventHandlerRequest.getState,
    );

    const getState = transactionEventHandlerRequest.getState;

    for (const builder of METRICS_BUILDERS) {
      try {
        const currentMetrics = builder({
          transactionMeta,
          allTransactions,
          getUIMetrics,
          getState,
        });

        merge(metrics, currentMetrics);
      } catch (error) {
        // Intentionally empty
      }
    }

    const event = generateEvent({
      ...defaultTransactionMetricProperties,
      ...metrics,
    });

    MetaMetrics.getInstance().trackEvent(event);
  };

/**
 * Handles metrics tracking when a transaction is added to the transaction controller
 * @param transactionMeta - The transaction metadata
 * @param transactionEventHandlerRequest - The event handler request containing state and controller references
 */
export const handleTransactionAddedEventForMetrics =
  createTransactionEventHandler(TRANSACTION_EVENTS.TRANSACTION_ADDED);

/**
 * Handles metrics tracking when a transaction is approved by the user
 * @param transactionMeta - The transaction metadata
 * @param transactionEventHandlerRequest - The event handler request containing state and controller references
 */
export const handleTransactionApprovedEventForMetrics =
  createTransactionEventHandler(TRANSACTION_EVENTS.TRANSACTION_APPROVED);

/**
 * Handles metrics tracking when a transaction is rejected by the user
 * @param transactionMeta - The transaction metadata
 * @param transactionEventHandlerRequest - The event handler request containing state and controller references
 */
export const handleTransactionRejectedEventForMetrics =
  createTransactionEventHandler(TRANSACTION_EVENTS.TRANSACTION_REJECTED);

/**
 * Handles metrics tracking when a transaction is submitted to the network
 * @param transactionMeta - The transaction metadata
 * @param transactionEventHandlerRequest - The event handler request containing state and controller references
 */
export const handleTransactionSubmittedEventForMetrics =
  createTransactionEventHandler(TRANSACTION_EVENTS.TRANSACTION_SUBMITTED);

// Intentionally using TRANSACTION_FINALIZED for confirmed/failed/dropped transactions
// as unified type for all finalized transactions.
// Status could be derived from transactionMeta.status
/**
 * Handles metrics tracking when a transaction is finalized (confirmed/failed/dropped)
 * This is a unified handler for all finalized transaction states, with the specific status
 * derived from transactionMeta.status
 *
 * @param transactionMeta - The transaction metadata
 * @param transactionEventHandlerRequest - The event handler request containing state and controller references
 * @returns Promise that resolves when the metrics event has been tracked
 */
export async function handleTransactionFinalizedEventForMetrics(
  transactionMeta: TransactionMeta,
  transactionEventHandlerRequest: TransactionEventHandlerRequest,
): Promise<void> {
  // Generate default properties
  const defaultTransactionMetricProperties =
    await generateDefaultTransactionMetrics(
      TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
      transactionMeta,
      transactionEventHandlerRequest,
    );

  // Generate smart transaction properties if applicable
  let smartTransactionProperties = { properties: {}, sensitiveProperties: {} };
  try {
    const { getState, initMessenger, smartTransactionsController } =
      transactionEventHandlerRequest;
    const shouldUseSmartTransaction = selectShouldUseSmartTransaction(
      getState(),
      transactionMeta.chainId,
    );
    if (shouldUseSmartTransaction) {
      const smartMetrics = await getSmartTransactionMetricsProperties(
        smartTransactionsController,
        transactionMeta,
        true,
        initMessenger as unknown as BaseControllerMessenger,
      );
      smartTransactionProperties = {
        properties: smartMetrics,
        sensitiveProperties: {},
      };
    }
  } catch (error) {
    Logger.log('Error getting smart transaction metrics:', error);
  }

  // Add RPC properties
  const rpcProperties = generateRPCProperties(transactionMeta.chainId);

  // Merge default, smart transaction, and RPC properties
  const mergedEventProperties = merge(
    {},
    defaultTransactionMetricProperties,
    smartTransactionProperties,
    {
      properties: rpcProperties.properties,
      sensitiveProperties: rpcProperties.sensitiveProperties,
    },
  );

  // Generate and track the event
  const event = generateEvent(mergedEventProperties);

  MetaMetrics.getInstance().trackEvent(event);
}
