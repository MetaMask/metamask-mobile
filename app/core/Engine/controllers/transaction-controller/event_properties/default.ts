import { merge } from 'lodash';
import {
  TransactionStatus,
  TransactionType,
  GasFeeEstimateType,
  GasFeeEstimateLevel,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/approval-controller';
import { Hex } from '@metamask/utils';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { BigNumber } from 'bignumber.js';

import type {
  TransactionMetrics,
  TransactionMetricsBuilderRequest,
} from '../types';
import { getConfirmationMetrics } from '../utils';
import type { RootState } from '../../../../../reducers';
import {
  getAddressAccountType,
  isHardwareAccount,
  isValidHexAddress,
} from '../../../../../util/address';
import { getMethodData } from '../../../../../util/transactions';
import { hasTransactionType } from '../../../../../components/Views/confirmations/utils/transaction';
import { EIP5792ErrorCode } from '../../../../../constants/transaction';

export async function getDefaultMetricsProperties({
  transactionMeta,
  transactionEventHandlerRequest,
}: TransactionMetricsBuilderRequest): Promise<TransactionMetrics> {
  const getState = transactionEventHandlerRequest.getState;
  const { chainId, error, status, type, id, origin } = transactionMeta || {};

  const { accountType, accountHardwareType } =
    getAccountTypeProperties(transactionMeta);
  const batchProperties = await getBatchProperties(transactionMeta);
  const gasFeeProperties = getGasMetricProperties(transactionMeta, getState);
  const transactionTypeProperty = getTransactionTypeValue(
    type,
    transactionMeta,
  );
  const transactionContractMethod =
    await getTransactionContractMethod(transactionMeta);

  const defaultProperties = {
    properties: {
      ...batchProperties,
      ...gasFeeProperties,
      account_type: accountType,
      account_hardware_type: accountHardwareType,
      chain_id: chainId,
      dapp_host_name: origin ?? 'N/A',
      error: error?.message,
      status,
      source: 'MetaMask Mobile',
      transaction_contract_method: transactionContractMethod,
      transaction_envelope_type: transactionMeta.txParams.type,
      transaction_internal_id: id,
      transaction_type: transactionTypeProperty,
    },
    sensitiveProperties: {},
  };

  const confirmationMetrics = getConfirmationMetrics(getState(), id);

  return merge({}, defaultProperties, confirmationMetrics);
}

export function getTransactionTypeValue(
  transactionType: TransactionType | undefined,
  transactionMeta?: TransactionMeta,
) {
  if (hasTransactionType(transactionMeta, [TransactionType.predictDeposit])) {
    return 'predict_deposit';
  }

  if (hasTransactionType(transactionMeta, [TransactionType.predictWithdraw])) {
    return 'predict_withdraw';
  }

  if (hasTransactionType(transactionMeta, [TransactionType.predictClaim])) {
    return 'predict_claim';
  }

  switch (transactionType) {
    case TransactionType.bridgeApproval:
      return 'bridge_approval';
    case TransactionType.contractInteraction:
      return 'contract_interaction';
    case TransactionType.deployContract:
      return 'deploy_contract';
    case TransactionType.ethGetEncryptionPublicKey:
      return 'eth_get_encryption_public_key';
    case TransactionType.perpsDeposit:
      return 'perps_deposit';
    case TransactionType.signTypedData:
      return 'eth_sign_typed_data';
    case TransactionType.relayDeposit:
      return 'relay_deposit';
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

const BATCHED_MESSAGE_TYPE = {
  WALLET_SEND_CALLS: 'wallet_sendCalls',
  ETH_SEND_TRANSACTION: 'eth_sendTransaction',
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

    properties.transaction_contract_method =
      await getNestedMethodNames(transactionMeta);

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

function getGasMetricProperties(
  transactionMeta: TransactionMeta,
  getState: () => RootState,
) {
  const {
    chainId,
    dappSuggestedGasFees,
    gasFeeEstimatesLoaded,
    gasFeeEstimates,
    gasFeeTokens,
    selectedGasFeeToken,
    txParams,
    userFeeLevel,
  } = transactionMeta;

  const { from } = txParams ?? {};
  const { type: gasFeeEstimateType } = gasFeeEstimates ?? {};

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

  const gas_payment_tokens_available = gasFeeTokens?.map(
    (token) => token.symbol,
  );

  let gas_paid_with = gasFeeTokens?.find(
    (token) =>
      token.tokenAddress.toLowerCase() === selectedGasFeeToken?.toLowerCase(),
  )?.symbol;

  if (selectedGasFeeToken?.toLowerCase() === getNativeTokenAddress(chainId)) {
    gas_paid_with = 'pre-funded_ETH';
  }

  const state = getState();
  const gas_insufficient_native_asset = getNativeBalance(
    state,
    chainId,
    from,
  ).lt(getMaxGasCost(transactionMeta));

  return {
    gas_estimation_failed: !gasFeeEstimatesLoaded,
    gas_fee_presented: presentedGasFeeOptions,
    gas_fee_selected: userFeeLevel,
    gas_insufficient_native_asset,
    gas_paid_with,
    gas_payment_tokens_available,
  };
}

async function getTransactionContractMethod(transactionMeta: TransactionMeta) {
  const methodData = await getMethodData(
    transactionMeta.txParams.data ?? '',
    transactionMeta.networkClientId,
  );
  return methodData?.name ? [methodData.name] : [];
}

function getMaxGasCost(transactionMeta: TransactionMeta): BigNumber {
  const { gas, gasPrice, maxFeePerGas } = transactionMeta.txParams ?? {};

  return new BigNumber(gas ?? '0x0').multipliedBy(
    maxFeePerGas ?? gasPrice ?? '0x0',
  );
}

function getNativeBalance(
  state: RootState,
  chainId: string,
  address: string,
): BigNumber {
  const accountsByChainId =
    state.engine?.backgroundState?.AccountTrackerController?.accountsByChainId;

  const account = accountsByChainId?.[chainId]?.[address?.toLowerCase()];

  return new BigNumber((account?.balance as Hex) ?? '0x0');
}

function getAccountTypeProperties(transactionMeta: TransactionMeta): {
  accountType: string;
  accountHardwareType: string | null;
} {
  const { from } = transactionMeta.txParams ?? {};

  let accountType = 'unknown';
  let accountHardwareType: string | null = null;

  try {
    if (isValidHexAddress(from)) {
      accountType = getAddressAccountType(from);

      if (isHardwareAccount(from)) {
        accountHardwareType = accountType;
      }
    }
  } catch {
    // Intentionally empty
  }

  return { accountType, accountHardwareType };
}
