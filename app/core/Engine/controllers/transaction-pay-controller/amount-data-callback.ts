import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { buildMoneyAccountDepositBatch } from '../../../../components/UI/Money/utils/moneyAccountTransactions';
import ReduxService from '../../../../core/redux/ReduxService';
import { RootState } from '../../../../reducers';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import { prefixError } from '../../../../util/transactions/error-prefix';

const UPDATE_AMOUNT_DATA_ERROR_PREFIX = 'Update Amount Data: ';
const MONEY_ACCOUNT_DEPOSIT_ERROR_PREFIX = 'Money Account Deposit: ';

interface GetAmountDataRequest {
  amount: string;
  transaction: TransactionMeta;
}

interface GetAmountDataResponse {
  updates: { nestedTransactionIndex: number; data: Hex }[];
}

function isMoneyAccountDeposit(transaction: TransactionMeta): boolean {
  if (transaction.type === TransactionType.moneyAccountDeposit) {
    return true;
  }
  return (
    transaction.nestedTransactions?.some(
      (tx) => tx.type === TransactionType.moneyAccountDeposit,
    ) ?? false
  );
}

export async function getAmountData(
  request: GetAmountDataRequest,
): Promise<GetAmountDataResponse> {
  const { amount, transaction } = request;

  if (!isMoneyAccountDeposit(transaction)) {
    return { updates: [] };
  }

  const vaultConfig = selectMoneyAccountVaultConfig(
    ReduxService.store.getState() as RootState,
  );
  if (!vaultConfig) {
    return { updates: [] };
  }

  const chainIdHex = transaction.chainId as Hex;
  const provider = getProviderByChainId(chainIdHex);
  if (!provider) {
    return { updates: [] };
  }

  const rawAmount = BigInt(amount);

  try {
    let buildResult;

    try {
      buildResult = await buildMoneyAccountDepositBatch({
        amount: rawAmount,
        chainId: chainIdHex,
        boringVault: vaultConfig.boringVault,
        tellerAddress: vaultConfig.tellerAddress,
        accountantAddress: vaultConfig.accountantAddress,
        lensAddress: vaultConfig.lensAddress,
        provider,
      });
    } catch (error) {
      throw prefixError(error, MONEY_ACCOUNT_DEPOSIT_ERROR_PREFIX);
    }

    return {
      updates: [
        { nestedTransactionIndex: 0, data: buildResult.approveTx.params.data },
        { nestedTransactionIndex: 1, data: buildResult.depositTx.params.data },
      ],
    };
  } catch (error) {
    throw prefixError(error, UPDATE_AMOUNT_DATA_ERROR_PREFIX);
  }
}
