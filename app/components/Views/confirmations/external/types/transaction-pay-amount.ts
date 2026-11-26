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
import { MONEY_ACCOUNT_DEPOSIT_TYPES } from '../../constants/confirmations';
import { getLighterUsdcDepositAmountCalls } from '../../temp-lighter/lighter-usdc-deposit';

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
  if (hasTransactionType(transactionMeta, MONEY_ACCOUNT_DEPOSIT_TYPES)) {
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
    hasTransactionType(transactionMeta, [
      TransactionType.perpsLighterDeposit,
      TransactionType.perpsLighterDepositAndOrder,
    ])
  ) {
    return getLighterUsdcDepositAmountCalls(transactionMeta, amountHuman);
  }

  // A Lighter withdraw is quoted from its required asset, which holds the
  // amount. The nested transfer is only a placeholder, so there are no calls to
  // re-encode and only the required asset amount is committed by the caller.
  // Without this, the generic single-call update rewrites the transfer only and
  // the required asset stays at the amount it had when Lighter was selected.
  if (
    hasTransactionType(transactionMeta, [TransactionType.perpsLighterWithdraw])
  ) {
    return [];
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
