import { merge } from 'lodash';
import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';

import type {
  TransactionMetrics,
  TransactionMetricsBuilderRequest,
} from '../types';
import { getConfirmationMetrics } from '../utils';
import {
  getAddressAccountType,
  isHardwareAccount,
  isValidHexAddress,
} from '../../../../../util/address';
import { getMethodData } from '../../../../../util/transactions';
import { hasTransactionType } from '../../../../../components/Views/confirmations/utils/transaction';

export async function getBaseMetricsProperties({
  transactionMeta,
  getState,
}: TransactionMetricsBuilderRequest): Promise<TransactionMetrics> {
  const { chainId, error, status, type, id, origin } = transactionMeta || {};

  const { accountType, accountHardwareType } =
    getAccountTypeProperties(transactionMeta);
  const transactionTypeProperty = getTransactionTypeValue(
    type,
    transactionMeta,
  );
  const transactionContractMethod =
    await getTransactionContractMethod(transactionMeta);

  const baseProperties = {
    properties: {
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

  return merge({}, baseProperties, confirmationMetrics);
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

async function getTransactionContractMethod(transactionMeta: TransactionMeta) {
  const methodData = await getMethodData(
    transactionMeta.txParams.data ?? '',
    transactionMeta.networkClientId,
  );
  return methodData?.name ? [methodData.name] : [];
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
