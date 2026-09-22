import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { prefixError } from '../../../../../util/transactions/error-prefix';
import {
  updateMoneyAccountDepositTokenAmount,
  updateMoneyAccountWithdrawTokenAmount,
} from '../../../../UI/Money/utils/moneyAccountTransactions';
import { UpdateTransactionPayAmountCall } from '../../types/transactions';

const DEPOSIT_ERROR_PREFIX = 'Money Account Deposit: ';
const WITHDRAW_ERROR_PREFIX = 'Money Account Withdrawal: ';

/**
 * Re-encodes the nested calls for transaction types that need bespoke amount
 * handling.
 *
 * This is the single junction where pay amount updates branch on transaction
 * type. Everything else stays generic in `useUpdateTransactionPayAmount`:
 * encoding the required asset amount, committing atomically, and the default
 * single-call token amount update.
 *
 * @param transactionMeta - Confirmation being updated.
 * @param amountHuman - Human-readable amount entered by the user.
 * @param accountOverride - Recipient override when the user picked another account.
 * @returns The calls to apply, or `undefined` when no bespoke handling applies.
 */
export async function getTransactionPayAmountCalls(
  transactionMeta: TransactionMeta,
  amountHuman: string,
  accountOverride?: Hex,
): Promise<UpdateTransactionPayAmountCall[] | undefined> {
  if (
    hasTransactionType(transactionMeta, [
      TransactionType.moneyAccountDeposit,
      // OGP: membershipSubscription will be added
      TransactionType.membershipSubscription as unknown as TransactionType,
    ])
  ) {
    try {
      return await updateMoneyAccountDepositTokenAmount(
        transactionMeta,
        amountHuman,
      );
    } catch (error) {
      throw prefixError(error, DEPOSIT_ERROR_PREFIX);
    }
  }

  if (
    hasTransactionType(transactionMeta, [TransactionType.moneyAccountWithdraw])
  ) {
    try {
      return await updateMoneyAccountWithdrawTokenAmount(
        transactionMeta,
        amountHuman,
        accountOverride,
      );
    } catch (error) {
      throw prefixError(error, WITHDRAW_ERROR_PREFIX);
    }
  }

  return undefined;
}
