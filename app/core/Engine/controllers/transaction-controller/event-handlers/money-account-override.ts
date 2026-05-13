import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { isEvmAccountType } from '@metamask/keyring-api';
import { Hex } from '@metamask/utils';

import Engine from '../../../../Engine';
import { replaceAccountInNestedTransactions } from '../../../../../components/Views/confirmations/utils/transaction-pay';

const MONEY_ACCOUNT_TRANSACTION_TYPES: readonly TransactionType[] = [
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
];

function hasMoneyAccountType(
  transaction: TransactionMeta,
  targetTypes: readonly TransactionType[],
): boolean {
  const { type, nestedTransactions } = transaction;

  if (type && targetTypes.includes(type)) {
    return true;
  }

  return (
    nestedTransactions?.some(
      (nested) => nested.type && targetTypes.includes(nested.type),
    ) ?? false
  );
}

function isMoneyAccountTransaction(transaction: TransactionMeta): boolean {
  return hasMoneyAccountType(transaction, MONEY_ACCOUNT_TRANSACTION_TYPES);
}

function isMoneyAccountWithdraw(transaction: TransactionMeta): boolean {
  return hasMoneyAccountType(transaction, [
    TransactionType.moneyAccountWithdraw,
  ]);
}

/**
 * Seeds `accountOverride` on TransactionPayController with the globally
 * selected account when a new money-account (deposit/withdraw) transaction
 * is added and no override is already set. Skips non-EVM selected accounts.
 * Handles both single transactions (withdraw) and EIP-7702 batches (deposit),
 * where the `moneyAccountDeposit` type sits in `nestedTransactions`.
 */
export function handleUnapprovedTransactionAddedForMoneyAccount(
  transaction: TransactionMeta,
): void {
  if (!isMoneyAccountTransaction(transaction)) {
    return;
  }

  const { TransactionPayController, AccountsController } = Engine.context;

  const existingOverride =
    TransactionPayController.state.transactionData[transaction.id]
      ?.accountOverride;

  if (existingOverride) {
    return;
  }

  const selectedAccount = AccountsController.getSelectedAccount();

  if (!selectedAccount || !isEvmAccountType(selectedAccount.type)) {
    return;
  }

  if (isMoneyAccountWithdraw(transaction)) {
    replaceAccountInNestedTransactions({
      transactionId: transaction.id,
      nestedTransactions: transaction.nestedTransactions,
      oldAddress: transaction.txParams?.from,
      newAddress: selectedAccount.address,
    });
  }

  TransactionPayController.setTransactionConfig(transaction.id, (config) => {
    config.accountOverride = selectedAccount.address as Hex;
  });
}
