import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { TRANSACTION_EVENTS } from '../../../Analytics/events/confirmations';
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
import Logger from '../../../../util/Logger';

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
  return (state.confirmationMetrics.metricsById?.[transactionId] ||
    {}) as unknown as TransactionMetrics;
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
  // Optional logging to debug the structure
  Logger.log('Event type:', eventType);
  Logger.log('TRANSACTION_EVENTS.TRANSACTION_SUBMITTED:', TRANSACTION_EVENTS.TRANSACTION_SUBMITTED);
  Logger.log('TransactionMeta:', JSON.stringify(transactionMeta, null, 2));

  const { chainId, status, origin, type } = transactionMeta;

  // Define a type for transaction data
  interface TransactionData {
    gasLimit?: string | { toString: () => string };
    gasPrice?: string | { toString: () => string };
    maxFeePerGas?: string | { toString: () => string };
    maxPriorityFeePerGas?: string | { toString: () => string };
    nonce?: number;
    type?: number;
    value?: string | { toString: () => string };
    to?: string;
    from?: string;
    [key: string]: any; // For any other properties
  }

  // Safely access transaction data with proper typing
  const txData: TransactionData = 'transaction' in transactionMeta
    ? (transactionMeta as unknown as { transaction: TransactionData }).transaction
    : transactionMeta;

  // Build the base properties object
  const properties: TransactionMetricsProperties = {
    chain_id: chainId,
    status,
    source: origin,
    transaction_type: type,
    gas_limit: txData.gasLimit?.toString(),
    gas_price: txData.gasPrice?.toString(),
    max_fee_per_gas: txData.maxFeePerGas?.toString(),
    max_priority_fee_per_gas: txData.maxPriorityFeePerGas?.toString(),
    nonce: txData.nonce,
    transaction_envelope_type: txData.type,
  };

  // Add RPC domain for specific event types
  // Check if we need to handle TRANSACTION_EVENTS differently
  // First, log the event structure to see how to access the category
  Logger.log('TRANSACTION_EVENTS.TRANSACTION_SUBMITTED structure:', TRANSACTION_EVENTS.TRANSACTION_SUBMITTED);

  // Try different ways to compare event types
  const isSubmittedOrFinalized =
    eventType === TRANSACTION_EVENTS.TRANSACTION_SUBMITTED.category ||
    eventType === TRANSACTION_EVENTS.TRANSACTION_FINALIZED.category ||
    eventType === TRANSACTION_EVENTS.TRANSACTION_SUBMITTED ||
    eventType === TRANSACTION_EVENTS.TRANSACTION_FINALIZED ||
    eventType === 'transaction_submitted' ||
    eventType === 'transaction_finalized';

  if (isSubmittedOrFinalized) {
    Logger.log('Getting RPC URL for chain ID:', chainId);
    const rpcUrl = getNetworkRpcUrl(chainId);
    Logger.log('RPC URL:', rpcUrl);
    const rpc_domain = extractRpcDomain(rpcUrl);
    Logger.log('Extracted RPC domain:', rpc_domain);

    if (rpc_domain) {
      properties.rpc_domain = rpc_domain;
    }
  }

  // Create the metrics event
  return {
    name: eventType,
    properties,
    sensitiveProperties: {
      value: txData.value?.toString(),
      to_address: txData.to,
      from_address: txData.from,
    },
    saveDataRecording: true,
  };
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
