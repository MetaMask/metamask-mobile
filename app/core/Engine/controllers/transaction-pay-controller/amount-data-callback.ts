import {
  TransactionMeta,
  hasTransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import {
  isPremiumDepositCandidate,
  resolveMoneyAccountDepositVault,
} from '../../../../components/UI/Money/utils/moneyAccountPremiumDeposit';
import { buildMoneyAccountDepositBatch } from '../../../../components/UI/Money/utils/moneyAccountTransactions';
import { MONEY_ACCOUNT_DEPOSIT_TYPES } from '../../../../components/Views/confirmations/constants/confirmations';
import ReduxService from '../../../../core/redux/ReduxService';
import { RootState } from '../../../../reducers';
import {
  selectMoneyAccountPremiumVaultConfig,
  selectMoneyAccountVaultConfig,
} from '../../../../selectors/featureFlagController/moneyAccount';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import { prefixError } from '../../../../util/transactions/error-prefix';

const UPDATE_AMOUNT_DATA_ERROR_PREFIX = 'Update Amount Data: ';
const MONEY_ACCOUNT_DEPOSIT_ERROR_PREFIX = 'Money Account Deposit: ';

interface GetAmountDataRequest {
  amount: string;
  // Only the second leg supplies a settled amount for Sentinel to sign.
  secondLeg?: boolean;
  transaction: TransactionMeta;
}

interface GetAmountDataResponse {
  updates: { nestedTransactionIndex: number; data: Hex; to?: Hex }[];
}

function isMoneyAccountDeposit(transaction: TransactionMeta): boolean {
  return hasTransactionType(transaction, MONEY_ACCOUNT_DEPOSIT_TYPES);
}

export async function getAmountData({
  amount,
  secondLeg,
  transaction,
}: GetAmountDataRequest): Promise<GetAmountDataResponse> {
  if (!isMoneyAccountDeposit(transaction)) {
    return { updates: [] };
  }

  const state = ReduxService.store.getState() as RootState;
  const baseVaultConfig = selectMoneyAccountVaultConfig(state);
  if (!baseVaultConfig) {
    return { updates: [] };
  }

  const chainIdHex = transaction.chainId as Hex;
  const provider = getProviderByChainId(chainIdHex);
  if (!provider) {
    return { updates: [] };
  }

  const rawAmount = BigInt(amount);

  try {
    const premiumVaultConfig =
      secondLeg && isPremiumDepositCandidate(state, chainIdHex)
        ? selectMoneyAccountPremiumVaultConfig(state)
        : undefined;
    const premiumAuthorization = premiumVaultConfig
      ? await resolveMoneyAccountDepositVault(
          chainIdHex,
          transaction.txParams.from,
          amount,
        )
      : undefined;
    const vaultConfig =
      premiumVaultConfig && premiumAuthorization
        ? premiumVaultConfig
        : baseVaultConfig;
    const buildResult = await buildMoneyAccountDepositBatch({
      amount: rawAmount,
      chainId: chainIdHex,
      boringVault: vaultConfig.boringVault,
      tellerAddress: vaultConfig.tellerAddress,
      accountantAddress: vaultConfig.accountantAddress,
      lensAddress: vaultConfig.lensAddress,
      provider,
      ...(premiumAuthorization && { premiumAuthorization }),
    }).catch((error: unknown) => {
      throw prefixError(error, MONEY_ACCOUNT_DEPOSIT_ERROR_PREFIX);
    });

    const approveData = buildResult.approveTx.params.data;
    const depositData = buildResult.depositTx.params.data;
    if (!approveData || !depositData) {
      throw new Error('Missing calldata in deposit batch result');
    }

    return {
      updates: [
        { nestedTransactionIndex: 0, data: approveData },
        {
          nestedTransactionIndex: 1,
          data: depositData,
          ...(secondLeg && { to: buildResult.depositTx.params.to }),
        },
      ],
    };
  } catch (error) {
    throw prefixError(error, UPDATE_AMOUNT_DATA_ERROR_PREFIX);
  }
}
