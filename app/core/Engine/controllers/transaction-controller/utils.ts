import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { merge } from 'lodash';

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
import { getNetworkRpcUrl, extractRpcDomain } from '../../../../util/rpc-domain-utils';

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

export function generateDefaultTransactionMetrics(
  metametricsEvent: IMetaMetricsEvent,
  transactionMeta: TransactionMeta,
  transactionEventHandlerRequest: TransactionEventHandlerRequest,
) {
  const { chainId, status, type, id } = transactionMeta;
  
  const mergedDefaultProperties = merge(
    {
      properties: {
        chain_id: chainId,
        status,
        source: 'MetaMask Mobile',
        transaction_type: getTransactionTypeValue(type),
        transaction_envelope_type: transactionMeta.txParams.type,
        transaction_internal_id: id,
      },
      sensitiveProperties: {
        value: transactionMeta.txParams.value,
        to_address: transactionMeta.txParams.to,
        from_address: transactionMeta.txParams.from,
      },
    },
    getConfirmationMetricProperties(
      transactionEventHandlerRequest.getState,
      id
    ),
  );

  return {
    metametricsEvent,
    ...mergedDefaultProperties,
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

export function generateRPCProperties(chainId: string) {
  const rpcUrl = getNetworkRpcUrl(chainId);
  const rpcDomain = extractRpcDomain(rpcUrl);

  const rpcMetrics = {
    properties: rpcDomain ? { rpc_domain: rpcDomain } : {},
    sensitiveProperties: {}
  };

  return rpcMetrics;
}
