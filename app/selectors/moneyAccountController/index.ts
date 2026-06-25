import { createSelector } from 'reselect';
import type { MoneyAccountControllerState } from '@metamask/money-account-controller';
import type { AccountGroupObject } from '@metamask/account-tree-controller';
import { RootState } from '../../reducers';
import { selectPrimaryHDKeyring } from '../keyringController';
import { selectSelectedAccountGroup } from '../multichainAccounts/accountTreeController';

const EMPTY_ARR: readonly string[] = Object.freeze([]);
const EMPTY_MONEY_ACCOUNTS: MoneyAccountControllerState['moneyAccounts'] =
  {};

interface AccountGroupEntropyMetadata {
  entropy?: {
    groupIndex?: number;
  };
}

function getSelectedAccountGroupEntropy(
  selectedAccountGroup: AccountGroupObject | null,
): { id: string; groupIndex: number } | null {
  if (!selectedAccountGroup?.id) {
    return null;
  }

  const [walletId, groupIndexFromId] = selectedAccountGroup.id.split('/');
  if (!walletId?.startsWith('entropy:')) {
    return null;
  }

  const entropyId = walletId.slice('entropy:'.length);
  const metadata = selectedAccountGroup.metadata as AccountGroupEntropyMetadata;
  const groupIndex =
    metadata.entropy?.groupIndex ?? Number.parseInt(groupIndexFromId ?? '', 10);

  if (!entropyId || !Number.isInteger(groupIndex)) {
    return null;
  }

  return { id: entropyId, groupIndex };
}

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
  (state: MoneyAccountControllerState | undefined) =>
    state?.moneyAccounts ?? EMPTY_MONEY_ACCOUNTS,
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

/**
 * Selects Money account addresses associated with the selected account group.
 *
 * @param state - The root Redux state.
 * @returns Money account addresses matching the selected group entropy.
 */
export const selectSelectedAccountGroupMoneyAccountAddresses = createSelector(
  [selectMoneyAccounts, selectSelectedAccountGroup],
  (moneyAccounts, selectedAccountGroup): readonly string[] => {
    const selectedGroupEntropy =
      getSelectedAccountGroupEntropy(selectedAccountGroup);

    if (!selectedGroupEntropy) {
      return EMPTY_ARR;
    }

    const addresses = Object.values(moneyAccounts)
      .filter(
        (account) =>
          account.options.entropy.id === selectedGroupEntropy.id &&
          account.options.entropy.groupIndex ===
            selectedGroupEntropy.groupIndex,
      )
      .map((account) => account.address)
      .filter((address): address is string => Boolean(address));

    return addresses.length > 0 ? addresses : EMPTY_ARR;
  },
);
