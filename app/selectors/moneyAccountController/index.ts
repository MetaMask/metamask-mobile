import { createSelector } from 'reselect';
import type { MoneyAccountControllerState } from '@metamask/money-account-controller';
import { RootState } from '../../reducers';
import { selectPrimaryHDKeyring } from '../keyringController';
import { isMnemonicMoneyAccount } from '../../lib/Money/money-accounts';

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
    const primaryKeyringId = primaryHDKeyring?.metadata?.id;
    if (!primaryKeyringId) {
      return undefined;
    }
    // MPC-backed money accounts have no entropy source ID, so they can never
    // be the primary (SRP-derived) money account.
    return Object.values(moneyAccounts).find(
      (account) =>
        isMnemonicMoneyAccount(account) &&
        account.options.entropy.id === primaryKeyringId,
    );
  },
);

/**
 * Selects the default Money account: the account named by the controller's
 * `defaultMoneyAccountId`. Falls back to the primary Money account when no
 * default is set, or when the default id does not resolve to an account.
 *
 * Use this for anything that pays to or binds the user's Money address. The
 * default moves to the MPC-backed account once the user has MFA enabled.
 *
 * @param state - The root Redux state.
 * @returns The default Money account, or the primary one as a fallback.
 */
export const selectDefaultMoneyAccount = createSelector(
  selectMoneyAccountControllerState,
  selectPrimaryMoneyAccount,
  (controllerState, primaryMoneyAccount) => {
    const defaultId = controllerState.defaultMoneyAccountId;
    if (defaultId === null) {
      return primaryMoneyAccount;
    }
    return controllerState.moneyAccounts[defaultId] ?? primaryMoneyAccount;
  },
);
