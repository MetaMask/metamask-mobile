import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { extractRpcDomain, getNetworkRpcUrl } from '../../../../util/rpc-domain-utils';

import type { RootState } from '../../../../reducers';
import { MetricsEventBuilder } from '../../../Analytics/MetricsEventBuilder';
import {
  JsonMap,
  IMetaMetricsEvent,
} from '../../../Analytics/MetaMetrics.types';
import type {
  TransactionEventHandlerRequest,
  TransactionMetrics,
} from './types';

export function getTransactionTypeValue(
  transactionType: TransactionType | undefined,
) {
  switch (transactionType) {
    case TransactionType.bridgeApproval:
      return 'bridge_approval';
    case TransactionType.contractInteraction:
      return 'contract_interaction';
    case TransactionType.deployContract:
      return 'deploy_contract';
    case TransactionType.ethGetEncryptionPublicKey:
      return 'eth_get_encryption_public_key';
    case TransactionType.signTypedData:
      return 'eth_sign_typed_data';
    case TransactionType.simpleSend:
      return 'simple_send';
    case TransactionType.stakingClaim:
      return 'staking_claim';
    case TransactionType.stakingDeposit:
      return 'staking_deposit';
    case TransactionType.stakingUnstake:
      return 'staking_unstake';
    case TransactionType.swapAndSend:
      return 'swap_and_send';
    case TransactionType.swapApproval:
      return 'swap_approval';
    case TransactionType.tokenMethodApprove:
      return 'token_method_approve';
    case TransactionType.tokenMethodIncreaseAllowance:
      return 'token_method_increase_allowance';
    case TransactionType.tokenMethodSafeTransferFrom:
      return 'token_method_safe_transfer_from';
    case TransactionType.tokenMethodSetApprovalForAll:
      return 'token_method_set_approval_for_all';
    case TransactionType.tokenMethodTransfer:
      return 'token_method_transfer';
    case TransactionType.tokenMethodTransferFrom:
      return 'token_method_transfer_from';
    // No need for snake case transformation
    // Already in snake case or single word
    case TransactionType.ethDecrypt:
    case TransactionType.personalSign:
    case TransactionType.bridge:
    case TransactionType.cancel:
    case TransactionType.incoming:
    case TransactionType.retry:
    case TransactionType.smart:
    case TransactionType.swap:
      return transactionType;
    default:
      return 'unknown';
  }
}

const getConfirmationMetricProperties = (
  getState: () => RootState,
  transactionId: string,
): TransactionMetrics => {
  const state = getState();
  const metrics = (state.confirmationMetrics.metricsById?.[transactionId] ||
    {}) as unknown as TransactionMetrics;

  // Add logging to see what data is coming from the confirmation metrics
  console.log('METRICS COMPARISON - Old metrics from state:', JSON.stringify(metrics));

  return metrics;
};

interface TransactionMetricsProperties {
  chain_id: string;
  status: string;
  source?: string;
  transaction_type?: string;
  gas_limit?: string;
  gas_price?: string;
  max_fee_per_gas?: string;
  max_priority_fee_per_gas?: string;
  nonce?: number;
  transaction_envelope_type?: number;
  rpc_domain?: string; // Add the rpc_domain property
}

export function generateDefaultTransactionMetrics(
  eventType: string,
  transactionMeta: TransactionMeta,
  transactionEventHandlerRequest: TransactionEventHandlerRequest,
) {
  const { chainId, status, origin, type } = transactionMeta;
  
  // Start with our new implementation properties
  const properties: Record<string, any> = {
    chain_id: chainId,
    status,
    source: 'MetaMask Mobile',
    transaction_type: type || 'unknown',
    transaction_envelope_type: type || 'unknown',
  };

  // Get txData for sensitive properties
  const txData = transactionMeta?.txParams || {};
  const sensitiveProperties: Record<string, any> = {
    value: txData.value?.toString(),
    to_address: txData.to,
    from_address: txData.from,
  };

  // Check if we need to add RPC domain
  const isSubmittedOrFinalized = 
    status === 'submitted' || 
    status === 'confirmed';

  console.log('METRICS COMPARISON - Event type and status check:', eventType, status, isSubmittedOrFinalized);

  if (isSubmittedOrFinalized) {
    // Always get RPC domain for all transaction statuses
    const rpcUrl = getNetworkRpcUrl(chainId);
    console.log('METRICS COMPARISON - RPC URL:', rpcUrl);

    const rpc_domain = extractRpcDomain(rpcUrl);
    console.log('METRICS COMPARISON - RPC domain:', rpc_domain);

    if (rpc_domain) {
      properties.rpc_domain = rpc_domain;
    }
  }

  // Preserve existing functionality "getting state metrics + merge if available"
  try {
    if (transactionEventHandlerRequest?.getState && transactionMeta.id) {
      const stateMetrics = getConfirmationMetricProperties(
        transactionEventHandlerRequest.getState,
        transactionMeta.id
      );
      
      console.log('METRICS COMPARISON - State metrics:', JSON.stringify(stateMetrics));
      
      // Check if stateMetrics has properties and merge them
      if (stateMetrics?.properties) {
        // Merge state metrics into our properties, preferring our new values if there's overlap
        Object.assign(properties, stateMetrics.properties);
        console.log('METRICS COMPARISON - After merging state properties:', JSON.stringify(properties));
      }
      
      // Also check for transaction_internal_id which seems important in the old implementation
      if (transactionMeta.id) {
        properties.transaction_internal_id = transactionMeta.id;
      }
    }
  } catch (e) {
    console.log('METRICS COMPARISON - Error getting state metrics:', e);
  }

  const output = {
    name: eventType,
    properties,
    sensitiveProperties,
    saveDataRecording: true,
  };
  
  console.log('METRICS COMPARISON - Final output:', JSON.stringify(output));
  
  return output;
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
  // Create a representation of the metrics object being sent
  const metricsObject = {
    metametricsEvent, // Include the entire event object
    properties: properties || {},
    sensitiveProperties: sensitiveProperties || {}
  };
  
  console.log('METRICS BEING SENT - metametricsEvent:', JSON.stringify(metametricsEvent));
  console.log('METRICS BEING SENT - properties:', JSON.stringify(properties || {}));
  console.log('METRICS BEING SENT - sensitiveProperties:', JSON.stringify(sensitiveProperties || {}));
  
  return MetricsEventBuilder.createEventBuilder(metametricsEvent)
    .addProperties(properties ?? {})
    .addSensitiveProperties(sensitiveProperties ?? {})
    .build();
}
