import { createSelector } from 'reselect';
import type { MoneyAccountControllerState } from '@metamask/money-account-controller';
import { RootState } from '../../reducers';
import { selectPrimaryHDKeyring } from '../keyringController';

const selectMoneyAccountControllerState = (state: RootState) =>
  state.engine.backgroundState.MoneyAccountController;

export const selectMoneyAccounts = createSelector(
  selectMoneyAccountControllerState,
  (state: MoneyAccountControllerState) => state.moneyAccounts,
);

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
