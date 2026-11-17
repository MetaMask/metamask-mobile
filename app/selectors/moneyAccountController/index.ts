import { createSelector } from 'reselect';
import type { MoneyAccountControllerState } from '@metamask/money-account-controller';
import { RootState } from '../../reducers';
import { selectPrimaryHDKeyring } from '../keyringController';
import { isMnemonicMoneyAccount } from '../../lib/Money/money-accounts';
import { isMpcMoneyKeyringBuildEnabled } from '../../constants/featureFlags';
import { areAddressesEqual } from '../../util/address';

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

const selectDefaultMoneyAccountId = createSelector(
  selectMoneyAccountControllerState,
  (state: MoneyAccountControllerState) => state.defaultMoneyAccountId,
);

const selectMoneyAccountLifecycleControllerState = (state: RootState) =>
  state.engine.backgroundState.MoneyAccountLifecycleController;

const findSfaMoneyAccount = (
  moneyAccounts: MoneyAccountControllerState['moneyAccounts'],
  primaryHDKeyring: ReturnType<typeof selectPrimaryHDKeyring>,
) => {
  const primaryKeyringId = primaryHDKeyring?.metadata?.id;
  if (!primaryKeyringId) {
    return undefined;
  }
  // MPC-backed money accounts have no entropy source ID.
  return Object.values(moneyAccounts).find(
    (account) =>
      isMnemonicMoneyAccount(account) &&
      account.options.entropy.id === primaryKeyringId,
  );
};

const selectSfaMoneyAccount = createSelector(
  selectMoneyAccounts,
  selectPrimaryHDKeyring,
  findSfaMoneyAccount,
);

/**
 * Selects the primary Money account: the MPC one if it exists, else the SRP one.
 *
 * @param state - The root Redux state.
 * @returns The primary Money account.
 */
export const selectPrimaryMoneyAccount = createSelector(
  selectMoneyAccounts,
  selectPrimaryHDKeyring,
  selectDefaultMoneyAccountId,
  (moneyAccounts, primaryHDKeyring, defaultMoneyAccountId) => {
    const defaultAccount = defaultMoneyAccountId
      ? moneyAccounts[defaultMoneyAccountId]
      : undefined;
    if (
      isMpcMoneyKeyringBuildEnabled() &&
      defaultAccount?.options?.entropy?.type === 'mpc'
    ) {
      return defaultAccount;
    }
    return findSfaMoneyAccount(moneyAccounts, primaryHDKeyring);
  },
);

/**
 * Selects the address that holds the Money balance. The lifecycle identity's
 * current address is authoritative, so a wallet migrated elsewhere or without
 * a local MPC account still reads the new account.
 *
 * @param state - The root Redux state.
 * @returns The address that holds the Money balance.
 */
export const selectMoneyAccountBalanceAddress = createSelector(
  selectSfaMoneyAccount,
  selectMoneyAccountLifecycleControllerState,
  selectPrimaryMoneyAccount,
  (sfaMoneyAccount, lifecycleControllerState, primaryMoneyAccount) => {
    const lifecycle = sfaMoneyAccount
      ? lifecycleControllerState?.moneyAccounts?.[
          sfaMoneyAccount.address.toLowerCase()
        ]
      : undefined;
    if (!lifecycle || lifecycle.type === 'notInIdentity') {
      return primaryMoneyAccount?.address;
    }
    const { currentAddress } = lifecycle.identity;
    return primaryMoneyAccount?.address &&
      areAddressesEqual(primaryMoneyAccount.address, currentAddress)
      ? primaryMoneyAccount.address
      : currentAddress;
  },
);
