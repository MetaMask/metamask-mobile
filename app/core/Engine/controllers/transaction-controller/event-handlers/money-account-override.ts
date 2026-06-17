import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { isEvmAccountType } from '@metamask/keyring-api';
import { Hex } from '@metamask/utils';

import Engine from '../../../../Engine';
import ReduxService from '../../../../redux';
import type { RootState } from '../../../../../reducers';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import TransactionTypes from '../../../../TransactionTypes';
import { replaceAccountInNestedTransactions } from '../../../../../components/Views/confirmations/utils/transaction-pay';
import { hasTransactionType } from '../../../../../components/Views/confirmations/utils/transaction';

const MONEY_ACCOUNT_TRANSACTION_TYPES: readonly TransactionType[] = [
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
];

function isMoneyAccountTransaction(transaction: TransactionMeta): boolean {
  return hasTransactionType(transaction, MONEY_ACCOUNT_TRANSACTION_TYPES);
}

function isMoneyAccountWithdraw(transaction: TransactionMeta): boolean {
  return hasTransactionType(transaction, [
    TransactionType.moneyAccountWithdraw,
  ]);
}

/**
 * Matches the Money Account → Card delegation approve. The transaction is
 * submitted by CardController and tagged with `origin = MMM_CARD`, but it is
 * NOT a money-account-typed transaction (it's a plain `tokenMethodApprove`),
 * so we need a separate non-type discriminator to route MM Pay sponsorship to
 * the user's selected EVM account.
 */
function isMoneyAccountCardLinkApprove(transaction: TransactionMeta): boolean {
  if (transaction.origin !== TransactionTypes.MMM_CARD) return false;
  const primary = selectPrimaryMoneyAccount(
    ReduxService.store.getState() as RootState,
  );
  const from = transaction.txParams?.from;
  if (!primary?.address || !from) return false;
  return from.toLowerCase() === primary.address.toLowerCase();
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
  if (
    !isMoneyAccountTransaction(transaction) &&
    !isMoneyAccountCardLinkApprove(transaction)
  ) {
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
