import type { Store } from '@reduxjs/toolkit';
import Engine from '../../../app/core/Engine';
import { updateBgState } from '../../../app/core/redux/slices/engine';

interface EngineWithState {
  state?: Record<string, unknown>;
  context: typeof Engine.context;
}

interface AccountsControllerSlice {
  internalAccounts: {
    accounts: Record<string, Record<string, unknown>>;
    selectedAccount: string;
  };
}

interface AccountTreeControllerSlice {
  accountTree: {
    wallets: Record<
      string,
      { groups: Record<string, Record<string, unknown>> }
    >;
  };
  selectedAccountGroup: string;
}

/**
 * Switches the selected EVM account through the same Engine-to-Redux path
 * EngineService uses, so selectors read the new account exactly as in the app.
 *
 * The account is created from the currently selected account when that id is
 * not already in AccountsController. `cleanup` restores the previous Engine
 * state.
 *
 * @param store - Redux store used by the component-view renderer.
 * @returns `switchTo` to select an account by id and address, and `cleanup`
 * to restore Engine state.
 */
export function createAccountSwitcher(store: Store) {
  const engineWithState = Engine as unknown as EngineWithState;
  const previousEngineState = engineWithState.state;

  const sync = (
    key: 'AccountsController' | 'AccountTreeController',
    nextState: AccountsControllerSlice | AccountTreeControllerSlice,
  ) => {
    engineWithState.state = {
      ...(engineWithState.state ?? {}),
      [key]: nextState,
    };
    store.dispatch(updateBgState({ key }));
  };

  const switchTo = (accountId: string, address: string): void => {
    const backgroundState = store.getState().engine.backgroundState;
    const accountsController =
      backgroundState.AccountsController as unknown as AccountsControllerSlice;
    const { accounts, selectedAccount } = accountsController.internalAccounts;
    sync('AccountsController', {
      ...accountsController,
      internalAccounts: {
        ...accountsController.internalAccounts,
        selectedAccount: accountId,
        accounts: {
          ...accounts,
          [accountId]: {
            ...(accounts[accountId] ?? accounts[selectedAccount]),
            id: accountId,
            address,
          },
        },
      },
    });

    const accountTreeController =
      backgroundState.AccountTreeController as unknown as AccountTreeControllerSlice;
    const groupId = accountTreeController.selectedAccountGroup;
    const [walletId] = groupId.split('/');
    const wallet = accountTreeController.accountTree.wallets[walletId];
    sync('AccountTreeController', {
      ...accountTreeController,
      accountTree: {
        ...accountTreeController.accountTree,
        wallets: {
          ...accountTreeController.accountTree.wallets,
          [walletId]: {
            ...wallet,
            groups: {
              ...wallet.groups,
              [groupId]: { ...wallet.groups[groupId], accounts: [accountId] },
            },
          },
        },
      },
    });
  };

  const cleanup = (): void => {
    engineWithState.state = previousEngineState;
  };

  return { switchTo, cleanup };
}
