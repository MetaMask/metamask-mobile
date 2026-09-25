import { createSelector } from 'reselect';
import type { MoneyAccountControllerState } from '@metamask/money-account-controller';
import { RootState } from '../../reducers';
import type { MigratedMoneyAccount } from '../../lib/Money/migration/types';
import { selectPrimaryHDKeyring } from '../keyringController';

/**
 * Selects the MoneyAccountController state from the root Redux state.
 *
 * @param state - The root Redux state.
 * @returns The MoneyAccountController state.
 */
const selectMoneyAccountControllerState = (state: RootState) =>
  state.engine.backgroundState.MoneyAccountController;

/**
 * Selects the Money accounts record.
 *
 * @param state - The root Redux state.
 * @returns The Money accounts record.
 */
export const selectMoneyAccounts = createSelector(
  selectMoneyAccountControllerState,
  (state: MoneyAccountControllerState) => state.moneyAccounts,
);

/**
 * Selects old Money address → migrated destination (ADR 0006/0007).
 *
 * @param state - The root Redux state.
 * @returns Migrated Money accounts keyed by lowercase old address.
 */
const EMPTY_MIGRATED: Record<string, MigratedMoneyAccount> = {};

export const selectMigratedMoneyAccounts = (state: RootState) =>
  state.engine.backgroundState.MoneyAccountMigrationController?.migrated ??
  EMPTY_MIGRATED;

/**
 * Selects the primary Money account. If it was migrated, the address points
 * at the new account so every `moneyAccountAddress` consumer follows.
 *
 * @param state - The root Redux state.
 * @returns The primary Money account.
 */
export const selectPrimaryMoneyAccount = createSelector(
  selectMoneyAccounts,
  selectPrimaryHDKeyring,
  selectMigratedMoneyAccounts,
  (moneyAccounts, primaryHDKeyring, migrated) => {
    const primaryKeyringId = primaryHDKeyring?.metadata?.id;
    if (!primaryKeyringId) {
      return undefined;
    }
    const account = Object.values(moneyAccounts).find(
      (candidate) => candidate.options.entropy.id === primaryKeyringId,
    );
    if (!account) {
      return undefined;
    }
    // ponytail: one hop; walk the chain if an account can migrate twice
    const target = migrated[account.address.toLowerCase()];
    return target ? { ...account, address: target.newAddress } : account;
  },
);
