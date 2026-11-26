import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';

export type PerpsProviderSelection = 'hyperliquid' | 'lighter';

/**
 * Transaction type for the provider the user picked, or undefined when the
 * current transaction is not a Perps deposit, withdraw, or deposit-and-order.
 *
 * Deposit and deposit-and-order follow `destination`. Withdraw follows
 * `source`. Hyperliquid keeps the existing types.
 *
 * @param options - Current type and the two selectors on the amount screen.
 * @param options.currentType - Type on the open confirmation.
 * @param options.destination - Receive-to choice on a deposit.
 * @param options.source - From choice on a withdraw.
 * @returns The type to store, or undefined when this confirmation is unchanged.
 */
export function perpsTransactionTypeForSelection({
  currentType,
  destination,
  source,
}: {
  currentType: string | undefined;
  destination: PerpsProviderSelection;
  source: PerpsProviderSelection;
}): TransactionType | undefined {
  if (
    currentType === TransactionType.perpsDeposit ||
    currentType === TransactionType.perpsLighterDeposit
  ) {
    return destination === 'lighter'
      ? TransactionType.perpsLighterDeposit
      : TransactionType.perpsDeposit;
  }

  if (
    currentType === TransactionType.perpsDepositAndOrder ||
    currentType === TransactionType.perpsLighterDepositAndOrder
  ) {
    return destination === 'lighter'
      ? TransactionType.perpsLighterDepositAndOrder
      : TransactionType.perpsDepositAndOrder;
  }

  if (
    currentType === TransactionType.perpsWithdraw ||
    currentType === TransactionType.perpsLighterWithdraw
  ) {
    return source === 'lighter'
      ? TransactionType.perpsLighterWithdraw
      : TransactionType.perpsWithdraw;
  }

  return undefined;
}

/**
 * Provider shown for a transaction type. Lighter types select Lighter.
 * Every other type, including the Hyperliquid Perps types, selects
 * Hyperliquid.
 *
 * @param type - Type on the open confirmation.
 * @returns The selector value that matches `type`.
 */
export function perpsProviderSelectionForType(
  type: string | undefined,
): PerpsProviderSelection {
  if (
    type === TransactionType.perpsLighterDeposit ||
    type === TransactionType.perpsLighterWithdraw ||
    type === TransactionType.perpsLighterDepositAndOrder
  ) {
    return 'lighter';
  }

  return 'hyperliquid';
}

/**
 * Perps withdraw type of a confirmation. The Perps withdraw is created as a
 * batch whose single nested transaction carries the type, so the type on the
 * confirmation itself is `batch`.
 *
 * @param transactionMeta - Open confirmation.
 * @returns The withdraw type, or undefined when this is not a Perps withdraw.
 */
export function getPerpsWithdrawType(
  transactionMeta:
    | Pick<TransactionMeta, 'type' | 'nestedTransactions'>
    | undefined,
):
  | TransactionType.perpsWithdraw
  | TransactionType.perpsLighterWithdraw
  | undefined {
  const types = [
    transactionMeta?.type,
    ...(transactionMeta?.nestedTransactions?.map(({ type }) => type) ?? []),
  ];

  return types.find(
    (
      type,
    ): type is
      | TransactionType.perpsWithdraw
      | TransactionType.perpsLighterWithdraw =>
      type === TransactionType.perpsWithdraw ||
      type === TransactionType.perpsLighterWithdraw,
  );
}
