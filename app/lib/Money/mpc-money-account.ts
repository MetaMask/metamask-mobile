import type { MoneyAccount } from '@metamask/money-account-controller';

/**
 * A money account whose address has been migrated to the MPC keyring.
 */
export type MpcBackedMoneyAccount = MoneyAccount & {
  options: MoneyAccount['options'] & { mpcKeyring: true };
};

/**
 * Check whether a money account is backed by the MPC keyring.
 *
 * @param moneyAccount - The money account to check.
 * @returns True when the account was migrated to the MPC keyring.
 */
export function isMpcBackedMoneyAccount(
  moneyAccount: MoneyAccount | undefined,
): moneyAccount is MpcBackedMoneyAccount {
  const options = moneyAccount?.options as
    | (MoneyAccount['options'] & { mpcKeyring?: boolean })
    | undefined;

  return options?.mpcKeyring === true;
}
