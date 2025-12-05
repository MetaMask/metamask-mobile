import type { TransactionMeta } from '@metamask/transaction-controller';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { merge } from 'lodash';

import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { selectIsPna25FlagEnabled } from '../../../../../selectors/featureFlagController/legalNotices';
import { selectIsPna25Acknowledged } from '../../../../../selectors/legalNotices';
import { getSmartTransactionMetricsProperties } from '../../../../../util/smart-transactions';
import { MetaMetrics } from '../../../../Analytics';
import { RootExtendedMessenger } from '../../../types';
import {
  generateDefaultTransactionMetrics,
  generateEvent,
  generateRPCProperties,
  getConfirmationMetricProperties,
} from '../utils';
import type {
  TransactionEventHandlerRequest,
  TransactionMetrics,
  TransactionMetricsBuilder,
} from '../types';
import { getMetaMaskPayProperties } from '../event_properties/metamask-pay';
import { getSimulationValuesProperties } from '../event_properties/simulation-values';
import Engine from '../../../Engine';
import { createProjectLogger } from '@metamask/utils';

const log = createProjectLogger('transaction-metrics');

const METRICS_BUILDERS: TransactionMetricsBuilder[] = [
  getMetaMaskPayProperties,
  getSimulationValuesProperties,
];

// Generic handler for simple transaction events
const createTransactionEventHandler =
  (eventType: (typeof TRANSACTION_EVENTS)[keyof typeof TRANSACTION_EVENTS]) =>
  async (
    transactionMeta: TransactionMeta,
    transactionEventHandlerRequest: TransactionEventHandlerRequest,
  ) => {
    try {
      const defaultTransactionMetricProperties =
        await generateDefaultTransactionMetrics(
          eventType,
          transactionMeta,
          transactionEventHandlerRequest,
        );

      const metrics = getBuilderMetrics({
        defaultMetrics: defaultTransactionMetricProperties,
        request: transactionEventHandlerRequest,
        transactionMeta,
      });

      const event = generateEvent({
        ...defaultTransactionMetricProperties,
        ...metrics,
      });

      log('Event', event);

      MetaMetrics.getInstance().trackEvent(event);
    } catch (error) {
      log('Error in transaction event handler', error);
    }
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

    const defaultTransactionMetricProperties =
      await generateDefaultTransactionMetrics(
        TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
        transactionMeta,
        transactionEventHandlerRequest,
      );

    const rpcProperties = generateRPCProperties(transactionMeta.chainId);
    const smartTransactionProperties = await generateStxProperties(
      transactionMeta,
      transactionEventHandlerRequest,
    );
    const hashProperty = generateHashProperty(
      transactionMeta,
      transactionEventHandlerRequest,
    );

    const mergedEventProperties = merge(
      {},
      defaultTransactionMetricProperties,
      smartTransactionProperties,
      hashProperty,
      rpcProperties,
    );

    const metrics = getBuilderMetrics({
      defaultMetrics: mergedEventProperties,
      request: transactionEventHandlerRequest,
      transactionMeta,
    });

    const event = generateEvent({ ...mergedEventProperties, ...metrics });

    log('Finalized event', event);

    MetaMetrics.getInstance().trackEvent(event);
  } catch (error) {
    log('Error in finalized transaction event handler', error);
  }
}

function retryIfEngineNotInitialized(fn: () => void): boolean {
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

function getBuilderMetrics({
  defaultMetrics,
  request,
  transactionMeta,
}: {
  defaultMetrics: TransactionMetrics;
  request: TransactionEventHandlerRequest;
  transactionMeta: TransactionMeta;
}) {
  const metrics = {
    properties: { ...defaultMetrics.properties },
    sensitiveProperties: { ...defaultMetrics.sensitiveProperties },
  };

  const allTransactions =
    request.getState()?.engine?.backgroundState?.TransactionController
      ?.transactions ?? [];

  const getUIMetrics = getConfirmationMetricProperties.bind(
    null,
    request.getState,
  );

  const getState = request.getState;

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

  return metrics;
}

function generateHashProperty(
  transactionMeta: TransactionMeta,
  transactionEventHandlerRequest: TransactionEventHandlerRequest,
) {
  const state = transactionEventHandlerRequest.getState();
  const isExtensionUxPna25Enabled = selectIsPna25FlagEnabled(state);
  const isPna25Acknowledged = selectIsPna25Acknowledged(state);

  if (isExtensionUxPna25Enabled && isPna25Acknowledged) {
    return {
      properties: {
        transaction_hash: transactionMeta.hash,
      },
    };
  }

  return {
    properties: {
      transaction_hash: undefined,
    },
  };
}

async function generateStxProperties(
  transactionMeta: TransactionMeta,
  transactionEventHandlerRequest: TransactionEventHandlerRequest,
) {
  let smartTransactionProperties = {
    properties: {},
    sensitiveProperties: {},
  };

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
        initMessenger as unknown as RootExtendedMessenger,
      );
      smartTransactionProperties = {
        properties: smartMetrics,
        sensitiveProperties: {},
      };
    }
  } catch (error) {
    log('Error getting smart transaction metrics', error);
  }

  return smartTransactionProperties;
}
