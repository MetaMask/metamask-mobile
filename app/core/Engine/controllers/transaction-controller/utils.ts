import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { merge } from 'lodash';
import { MetricsEventBuilder } from '../../../Analytics/MetricsEventBuilder';
import {
  JsonMap,
  IMetaMetricsEvent,
} from '../../../Analytics/MetaMetrics.types';
import type { TransactionMetricRequest } from './types';

export function getTransactionTypeValue(transactionType: TransactionType | undefined) {
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

export function generateDefaultTransactionMetrics(
  metametricsEvent: IMetaMetricsEvent,
  transactionMeta: TransactionMeta,
  { getTransactionMetricProperties }: TransactionMetricRequest,
) {
  const { chainId, id, type, status } = transactionMeta;

  const mergedDefaultProperties = merge(
    {
      metametricsEvent,
      properties: {
        chain_id: chainId,
        transaction_internal_id: id,
        transaction_type: getTransactionTypeValue(type),
        status,
      },
    },
    getTransactionMetricProperties(id),
  );

  return mergedDefaultProperties;
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
