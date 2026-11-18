import type { Store } from '@reduxjs/toolkit';
import {
  DEFAULT_ORDER_BOOK_PREFERENCES,
  type OrderBookPreferences,
  type PerpsControllerState,
  type PerpsMode,
} from '@metamask/perps-controller';
import { strings } from '../../../locales/i18n';
import Engine from '../../../app/core/Engine';
import ReduxService from '../../../app/core/redux/ReduxService';
import { updateBgState } from '../../../app/core/redux/slices/engine';
import type { ReduxStore } from '../../../app/core/redux/types';

/**
 * Shared helpers for Perps component/view tests.
 * Add only what view tests need; use i18n (strings()) for any user-facing labels to stay consistent with the app.
 */

/** Labels from i18n (same keys as PerpsModifyActionSheet). Used by PerpsSelectModifyActionView.view.test. */
export function getModifyActionLabels() {
  return {
    title: strings('perps.modify.title'),
    addPosition: strings('perps.modify.add_to_position'),
    reducePosition: strings('perps.modify.reduce_position'),
    flipPosition: strings('perps.modify.flip_position'),
    close: strings('navigation.close'),
  };
}

interface EngineWithState {
  state?: Record<string, unknown>;
  context: typeof Engine.context;
}

type ProLayoutPreferencesPatch = Record<string, unknown>;

type WirePerpsControllerForStoreCleanup = () => void;

/**
 * Creates a typed bridge between the mocked Engine state and Redux.
 *
 * Staging mirrors a controller update without notifying Redux. Flushing
 * delivers the staged state through the same reducer action used by
 * EngineService, which lets view tests control that boundary explicitly.
 *
 * @param store - Redux store used by the component-view renderer.
 * @returns State staging, flushing, synchronization, and cleanup utilities.
 */
export function createPerpsControllerStateHarness(store: Store) {
  const engineWithState = Engine as unknown as EngineWithState;
  const previousEngineState = engineWithState.state;

  const stage = (patch: Partial<PerpsControllerState>): void => {
    const backgroundState = store.getState().engine.backgroundState as Record<
      string,
      unknown
    >;
    const existingPerps =
      (backgroundState.PerpsController as
        | Partial<PerpsControllerState>
        | undefined) ?? {};
    const existingEnginePerps =
      (engineWithState.state?.PerpsController as
        | Partial<PerpsControllerState>
        | undefined) ?? {};

    engineWithState.state = {
      ...(engineWithState.state ?? {}),
      PerpsController: {
        ...existingPerps,
        ...existingEnginePerps,
        ...patch,
      },
    };
  };

  const flush = (): void => {
    store.dispatch(updateBgState({ key: 'PerpsController' }));
  };

  const sync = (patch: Partial<PerpsControllerState>): void => {
    stage(patch);
    flush();
  };

  const cleanup = (): void => {
    engineWithState.state = previousEngineState;
  };

  return { stage, flush, sync, cleanup };
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
 * @param store - Redux store used by the component-view renderer.
 * @returns `switchTo` to select an account by id and address (created from the
 * initially selected account when missing), and `cleanup` to restore Engine
 * state.
 */
export function createPerpsAccountSwitcher(store: Store) {
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

/**
 * Mirrors real PerpsController messengers so Pro preference / mode writes
 * update Redux selectors in component view tests.
 *
 * Returns a cleanup that restores the previous `ReduxService.store` and the
 * original `setProLayoutPreferences` / `setPerpsMode` /
 * `setOrderBookPreferences` implementations so later suites on the same Jest
 * worker do not dispatch against a disposed store.
 */
export function wirePerpsControllerForStore(
  store: Store,
): WirePerpsControllerForStoreCleanup {
  let previousStore: ReduxStore | undefined;
  try {
    previousStore = ReduxService.store;
  } catch {
    previousStore = undefined;
  }

  // Haptics/toasts read gates via ReduxService.store; without this, place-order
  // success notifications fail-open after Logger.error("store does not exist").
  ReduxService.store = store as unknown as ReduxStore;

  const perpsController = Engine.context.PerpsController as unknown as {
    setProLayoutPreferences: (prefs: ProLayoutPreferencesPatch) => void;
    setPerpsMode: (mode: PerpsMode) => void;
    setVisibleCandleCount: (count: number) => void;
    setOrderBookPreferences: (patch: Partial<OrderBookPreferences>) => void;
  };
  const originalSetProLayoutPreferences =
    perpsController.setProLayoutPreferences;
  const originalSetPerpsMode = perpsController.setPerpsMode;
  const originalSetVisibleCandleCount = perpsController.setVisibleCandleCount;
  const originalSetOrderBookPreferences =
    perpsController.setOrderBookPreferences;
  const stateHarness = createPerpsControllerStateHarness(store);

  perpsController.setProLayoutPreferences = jest.fn((prefs) => {
    const backgroundState = store.getState().engine.backgroundState as Record<
      string,
      unknown
    >;
    const existingPerps =
      (backgroundState.PerpsController as
        | Record<string, unknown>
        | undefined) ?? {};
    const existingPrefs =
      (existingPerps.proLayoutPreferences as
        | Record<string, unknown>
        | undefined) ?? {};

    stateHarness.sync({
      proLayoutPreferences: {
        ...existingPrefs,
        ...prefs,
      } as PerpsControllerState['proLayoutPreferences'],
    });
  });

  perpsController.setPerpsMode = jest.fn((mode) => {
    stateHarness.sync({ mode });
  });

  perpsController.setVisibleCandleCount = jest.fn((count: number) => {
    stateHarness.sync({ visibleCandleCount: count });
  });

  perpsController.setOrderBookPreferences = jest.fn((patch) => {
    const backgroundState = store.getState().engine.backgroundState as Record<
      string,
      unknown
    >;
    const existingPerps =
      (backgroundState.PerpsController as
        | Record<string, unknown>
        | undefined) ?? {};
    const existingPrefs =
      (existingPerps.orderBookPreferences as
        | Partial<OrderBookPreferences>
        | undefined) ?? {};

    stateHarness.sync({
      orderBookPreferences: {
        ...DEFAULT_ORDER_BOOK_PREFERENCES,
        ...existingPrefs,
        ...patch,
      },
    });
  });

  return () => {
    perpsController.setProLayoutPreferences = originalSetProLayoutPreferences;
    perpsController.setPerpsMode = originalSetPerpsMode;
    perpsController.setVisibleCandleCount = originalSetVisibleCandleCount;
    perpsController.setOrderBookPreferences = originalSetOrderBookPreferences;
    stateHarness.cleanup();
    if (previousStore) {
      ReduxService.store = previousStore;
    }
  };
}
