import type { MoneyAccountControllerState } from '@metamask/money-account-controller';

/**
 * Returns true when `walletAddress` corresponds to any money account on the
 * user's device.
 *
 * This is the single source of truth for "is this token tied to a money
 * account?" across Card surfaces (Card Home label, Add Funds redirect,
 * Manage Limit lock, Asset Selection per-row label).
 *
 * INTERIM: today we identify money-account entries by matching the funding
 * token's `walletAddress` against the set of known money account addresses.
 * Once Veda vault tokens land — and because only money accounts can delegate
 * to vault tokens — this predicate should switch to a token-identity check
 * (e.g. matching the token address / chain). The flag name and consumers
 * stay unchanged; only this predicate needs to change.
 *
 * @param walletAddress - The funding token's wallet address (the account
 * that holds the delegated allowance for the card).
 * @param moneyAccounts - The money account record from
 * `selectMoneyAccounts`.
 * @returns True when `walletAddress` matches any known money account
 * address (case-insensitive).
 */
export const isMoneyAccountEntry = (
  walletAddress: string | undefined,
  moneyAccounts: MoneyAccountControllerState['moneyAccounts'],
): boolean => {
  if (!walletAddress) {
    return false;
  }
  const target = walletAddress.toLowerCase();
  return Object.values(moneyAccounts).some(
    (account) => account.address.toLowerCase() === target,
  );
};
