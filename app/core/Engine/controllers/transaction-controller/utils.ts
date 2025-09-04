import { Hex } from '@metamask/utils';
import { ORIGIN_METAMASK } from '@metamask/approval-controller';
import {
  TransactionStatus,
  TransactionType,
  GasFeeEstimateType,
  GasFeeEstimateLevel,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { merge } from 'lodash';

import type { RootState } from '../../../../reducers';
import { EIP5792ErrorCode } from '../../../../constants/transaction';
import { getMethodData } from '../../../../util/transactions';
import { MetricsEventBuilder } from '../../../Analytics/MetricsEventBuilder';
import {
  JsonMap,
  IMetaMetricsEvent,
} from '../../../Analytics/MetaMetrics.types';
import {
  getNetworkRpcUrl,
  extractRpcDomain,
} from '../../../../util/rpc-domain-utils';
import type {
  TransactionEventHandlerRequest,
  TransactionMetrics,
} from './types';
import {
  getAddressAccountType,
  isValidHexAddress,
} from '../../../../util/address';

const BATCHED_MESSAGE_TYPE = {
  WALLET_SEND_CALLS: 'wallet_sendCalls',
  ETH_SEND_TRANSACTION: 'eth_sendTransaction',
};

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
    case TransactionType.batch:
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

async function getNestedMethodNames(
  transactionMeta: TransactionMeta,
): Promise<string[]> {
  const { nestedTransactions: transactions = [], networkClientId } =
    transactionMeta ?? {};
  const allData = transactions
    .filter((tx) => tx.type === TransactionType.contractInteraction && tx.data)
    .map((tx) => tx.data as Hex);

  const results = await Promise.all(
    allData.map((data) => getMethodData(data, networkClientId)),
  );

  const names = results
    .map((result) => result?.name)
    .filter((name) => name?.length) as string[];

  return names;
}

async function getBatchProperties(transactionMeta: TransactionMeta) {
  const properties: Record<string, unknown> = {};
  const { delegationAddress, nestedTransactions, origin, txParams } =
    transactionMeta;
  const isExternal = origin && origin !== ORIGIN_METAMASK;
  const { authorizationList } = txParams;
  const isBatch = Boolean(nestedTransactions?.length);
  const isUpgrade = Boolean(authorizationList?.length);

  if (isExternal) {
    properties.api_method = isBatch
      ? BATCHED_MESSAGE_TYPE.WALLET_SEND_CALLS
      : BATCHED_MESSAGE_TYPE.ETH_SEND_TRANSACTION;
  }

  if (isBatch) {
    properties.batch_transaction_count = nestedTransactions?.length;
    properties.batch_transaction_method = 'eip7702';

    properties.transaction_contract_method = await getNestedMethodNames(
      transactionMeta,
    );

    properties.transaction_contract_address = nestedTransactions
      ?.filter(
        (tx) =>
          tx.type === TransactionType.contractInteraction && tx.to?.length,
      )
      .map((tx) => tx.to as string);
  }

  if (transactionMeta.status === TransactionStatus.rejected) {
    const { error } = transactionMeta;

    properties.eip7702_upgrade_rejection =
      // @ts-expect-error Code has string type in controller
      isUpgrade && error.code === EIP5792ErrorCode.RejectedUpgrade;
  }
  properties.eip7702_upgrade_transaction = isUpgrade;
  properties.account_eip7702_upgraded = delegationAddress;

  return properties;
}

export async function generateDefaultTransactionMetrics(
  metametricsEvent: IMetaMetricsEvent,
  transactionMeta: TransactionMeta,
  transactionEventHandlerRequest: TransactionEventHandlerRequest,
) {
  const { chainId, status, type, id, origin, txParams } = transactionMeta || {};
  const { from } = txParams || {};

  const accountType = isValidHexAddress(from)
    ? getAddressAccountType(from)
    : 'unknown';

  const batchProperties = await getBatchProperties(transactionMeta);
  const gasFeeProperties = getGasMetricProperties(transactionMeta);

  const mergedDefaultProperties = merge(
    {
      metametricsEvent,
      properties: {
        ...batchProperties,
        chain_id: chainId,
        ...gasFeeProperties,
        status,
        source: 'MetaMask Mobile',
        transaction_contract_method: await getTransactionContractMethod(
          transactionMeta,
        ),
        transaction_envelope_type: transactionMeta.txParams.type,
        transaction_internal_id: id,
        transaction_type: getTransactionTypeValue(type),
        account_type: accountType,
        dapp_host_name: origin ?? 'N/A',
      },
      sensitiveProperties: {
        from_address: transactionMeta.txParams.from,
        to_address: transactionMeta.txParams.to,
        value: transactionMeta.txParams.value,
      },
    },
    getConfirmationMetricProperties(
      transactionEventHandlerRequest.getState,
      id,
    ),
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

export function generateRPCProperties(chainId: string) {
  const rpcUrl = getNetworkRpcUrl(chainId);
  const rpcDomain = extractRpcDomain(rpcUrl);
  const rpcMetrics = {
    properties: rpcDomain ? { rpc_domain: rpcDomain } : {},
    sensitiveProperties: {},
  };
  return rpcMetrics;
}

function getGasMetricProperties(transactionMeta: TransactionMeta) {
  const {
    gasFeeEstimatesLoaded,
    gasFeeEstimates,
    dappSuggestedGasFees,
    userFeeLevel,
  } = transactionMeta;
  const { type: gasFeeEstimateType } = gasFeeEstimates ?? {};

  // Advanced is always presented
  const presentedGasFeeOptions = ['custom'];

  if (gasFeeEstimatesLoaded) {
    if (
      gasFeeEstimateType === GasFeeEstimateType.FeeMarket ||
      gasFeeEstimateType === GasFeeEstimateType.Legacy
    ) {
      presentedGasFeeOptions.push(
        GasFeeEstimateLevel.Low,
        GasFeeEstimateLevel.Medium,
        GasFeeEstimateLevel.High,
      );
    }

    if (gasFeeEstimateType === GasFeeEstimateType.GasPrice) {
      presentedGasFeeOptions.push('network_proposed');
    }

    if (dappSuggestedGasFees) {
      presentedGasFeeOptions.push('dapp_proposed');
    }
  }

  return {
    gas_estimation_failed: !gasFeeEstimatesLoaded,
    gas_fee_presented: presentedGasFeeOptions,
    gas_fee_selected: userFeeLevel,
  };
}

async function getTransactionContractMethod(transactionMeta: TransactionMeta) {
  const methodData = await getMethodData(
    transactionMeta.txParams.data ?? '',
    transactionMeta.networkClientId,
  );
  return methodData?.name ? [methodData.name] : [];
}
