import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
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
 * Pay flags are configured on the Hyperliquid transaction type. Selecting
 * Lighter replaces that type, so a flag with no Lighter entry still applies.
 *
 * @param type - Type on the open confirmation.
 * @returns The Hyperliquid type for a Lighter type, otherwise `type`.
 */
export function perpsPayFlagType(type: string | undefined): string | undefined {
  switch (type) {
    case TransactionType.perpsLighterDeposit:
      return TransactionType.perpsDeposit;
    case TransactionType.perpsLighterDepositAndOrder:
      return TransactionType.perpsDepositAndOrder;
    case TransactionType.perpsLighterWithdraw:
      return TransactionType.perpsWithdraw;
    default:
      return type;
  }
}

/**
 * Flag value for this confirmation.
 *
 * An entry for the confirmation's own type wins, including a type on a nested
 * transaction. A Lighter Perps type with no entry uses the Hyperliquid type.
 *
 * @param flags - Flag map keyed by transaction type.
 * @param transactionMeta - Open confirmation.
 * @returns The matching value, or undefined when no entry applies.
 */
export function payFlagForTransactionType<T>(
  flags: Record<string, T>,
  transactionMeta: TransactionMeta | undefined,
): T | undefined {
  for (const [flagType, value] of Object.entries(flags)) {
    if (hasTransactionType(transactionMeta, [flagType as TransactionType])) {
      return value;
    }
  }

  const aliasedType = perpsPayFlagType(transactionMeta?.type);
  if (
    aliasedType &&
    aliasedType !== transactionMeta?.type &&
    Object.prototype.hasOwnProperty.call(flags, aliasedType)
  ) {
    return flags[aliasedType];
  }

  return undefined;
}
