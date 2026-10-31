import { createSelector } from 'reselect';
import type { Hex } from '@metamask/utils';
import { RootState } from '../../reducers';
import { selectPrimaryMoneyAccount } from '../moneyAccountController';

/**
 * Selects the accounts the MoneyAccountUpgradeController has recorded as
 * fully upgraded on this device, keyed by lowercased address.
 *
 * @param state - The root Redux state.
 * @returns The upgraded accounts record.
 */
export const selectUpgradedMoneyAccounts = (state: RootState) =>
  state.engine.backgroundState.MoneyAccountUpgradeController.upgradedAccounts;

/**
 * Selects this device's upgrade record for the primary Money account.
 *
 * @param state - The root Redux state.
 * @returns The upgrade record, or undefined if the upgrade has not completed
 * on this device.
 */
export const selectPrimaryMoneyAccountUpgradeRecord = createSelector(
  selectUpgradedMoneyAccounts,
  selectPrimaryMoneyAccount,
  (upgradedAccounts, primaryMoneyAccount) => {
    if (!primaryMoneyAccount) {
      return undefined;
    }
    return upgradedAccounts[primaryMoneyAccount.address.toLowerCase() as Hex];
  },
);
