import { merge } from 'lodash';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';

import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { getSmartTransactionMetricsProperties } from '../../../../../util/smart-transactions';
import { MetaMetrics } from '../../../../Analytics';
import { BaseControllerMessenger } from '../../../types';
import { generateDefaultTransactionMetrics, generateEvent } from '../utils';
import type { TransactionEventHandlerRequest } from '../types';
import Logger from '../../../../../util/Logger';
import { selectTransactionsTxHashInAnalyticsEnabled } from '../../../../../selectors/featureFlagController';

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

    const event = generateEvent(defaultTransactionMetricProperties);
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
  Logger.log('⚡⚡⚡ TRANSACTION FINALIZED METRICS HANDLER CALLED ⚡⚡⚡');
  const { getState, initMessenger, smartTransactionsController } =
    transactionEventHandlerRequest;

  const defaultTransactionMetricProperties = generateDefaultTransactionMetrics(
    TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
    transactionMeta,
    transactionEventHandlerRequest,
  );

  let stxMetricsProperties = {};

  const shouldUseSmartTransaction = selectShouldUseSmartTransaction(getState());
  if (shouldUseSmartTransaction) {
    stxMetricsProperties = await getSmartTransactionMetricsProperties(
      smartTransactionsController,
      transactionMeta,
      true,
      initMessenger as unknown as BaseControllerMessenger,
    );
  }

  const metaMetricsInstance = MetaMetrics.getInstance();

  let isMetricsOptedIn = false;
  try {
    // Call isEnabled directly
    isMetricsOptedIn = metaMetricsInstance.isEnabled();
  } catch (error) {
    Logger.error(new Error('Error checking if metrics are enabled:'), error);
    // If isEnabled() fails, default to false for safety
    isMetricsOptedIn = false;
  }

  // Use the selector to check if the feature flag is enabled
  const isTxHashFeatureFlagEnabled = selectTransactionsTxHashInAnalyticsEnabled(getState());

  let enhancedProperties = {};
  if (isMetricsOptedIn && isTxHashFeatureFlagEnabled) {
    // Add enhanced properties for analytics when feature flag is enabled
    // These properties help with transaction tracking and analysis
    // while respecting user privacy (only added for opted-in users)

    let metaMetricsId;
    try {
      metaMetricsId = await metaMetricsInstance.getMetaMetricsId();
    } catch (error) {
      Logger.error(new Error('Error getting MetaMetrics ID:'), error);
      // Continue with the rest of the properties even if this fails
    }

    enhancedProperties = {
      ...(transactionMeta.hash ? { transaction_hash: transactionMeta.hash } : {}),
      ...(metaMetricsId ? { user_id: metaMetricsId } : {}),
      ...(transactionMeta.chainId ? { chain_id: transactionMeta.chainId } : {}),
      ...(transactionMeta.type ? { transaction_type: transactionMeta.type } : {}),
      ...(transactionMeta.origin ? { dapp_url: transactionMeta.origin } : {})
    };
  }

  const mergedEventProperties = merge(
    {
      properties: {
        ...stxMetricsProperties,
        ...enhancedProperties
      },
    },
    defaultTransactionMetricProperties,
  );

  const event = generateEvent(mergedEventProperties);

  console.log('Transaction Finalized Event Properties:', JSON.stringify(event.properties, null, 2));
  console.log('Is feature flag enabled:', isTxHashFeatureFlagEnabled);
  console.log('Is metrics opted in:', isMetricsOptedIn);
  console.log('Transaction hash:', transactionMeta.hash);
  console.log('Enhanced Event Properties:', JSON.stringify(enhancedProperties, null, 2));

  console.log('Transaction Finalized Analytics Payload:', JSON.stringify({
    // Debug info
    isTxHashFeatureFlagEnabled,
    isMetricsOptedIn,

    // Full properties
    enhancedProperties,
    mergedEventProperties
  }));

  metaMetricsInstance.trackEvent(event); // Reuse existing reference
}
