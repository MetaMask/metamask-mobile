import { TransactionType } from '@metamask/transaction-controller';
import { MonetizedPrimitive } from '../../MetaMetrics.types';

/**
 * Determines the monetized primitive for a given EVM transaction type.
 * Returns undefined if the transaction doesn't involve a monetized primitive.
 */
export function getMonetizedPrimitive(
  transactionType: TransactionType | string | undefined,
): MonetizedPrimitive | undefined {
  switch (transactionType) {
    case TransactionType.swap:
    case TransactionType.swapApproval:
    case TransactionType.swapAndSend:
    case TransactionType.bridge:
    case TransactionType.bridgeApproval:
      return MonetizedPrimitive.Swaps;
    case TransactionType.perpsDeposit:
    case TransactionType.perpsDepositAndOrder:
    case TransactionType.perpsWithdraw:
      return MonetizedPrimitive.Perps;
    case TransactionType.predictDeposit:
    case TransactionType.predictWithdraw:
    case TransactionType.predictClaim:
      return MonetizedPrimitive.Predict;
    case TransactionType.moneyAccountDeposit:
    case TransactionType.moneyAccountWithdraw:
      return MonetizedPrimitive.MoneyAccount;
    default:
      return undefined;
  }
}
