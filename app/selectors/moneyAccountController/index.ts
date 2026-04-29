import { createSelector } from 'reselect';
import type { MoneyAccountControllerState } from '@metamask/money-account-controller';
import { RootState } from '../../reducers';
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
 * Selects the primary Money account.
 *
 * @param state - The root Redux state.
 * @returns The primary Money account.
 */
export const selectPrimaryMoneyAccount = createSelector(
  selectMoneyAccounts,
  selectPrimaryHDKeyring,
  (moneyAccounts, primaryHDKeyring) => {
    const primaryKeyringId = primaryHDKeyring?.metadata.id;
    if (!primaryKeyringId) {
      return undefined;
    }
    return Object.values(moneyAccounts).find(
      (account) => account.options.entropy.id === primaryKeyringId,
    );
  },
);
