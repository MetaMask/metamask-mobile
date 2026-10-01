import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { PerpsActiveProviderMode } from '@metamask/perps-controller';
import type { RootState } from '../../../../reducers';
import { initialStatePerps } from '../../../../../tests/component-view/presets/perpsStatePreset';
import { usePerpsRecoveryContext } from './usePerpsRecoveryContext';

const ACCOUNT_A = '0x8Dc623E964475D4d669da601Fd15ea9125469003';
const ACCOUNT_B = '0x1234567890123456789012345678901234567890';

const createState = ({
  address = ACCOUNT_A,
  isTestnet = true,
  provider = 'lighter',
}: {
  address?: string;
  isTestnet?: boolean;
  provider?: PerpsActiveProviderMode;
} = {}): RootState =>
  initialStatePerps()
    .withMinimalAccounts(address)
    .withAccountTreeForSelectedAccount()
    .withOverrides({
      engine: {
        backgroundState: {
          PerpsController: { isTestnet, activeProvider: provider },
        },
      },
    })
    .build() as RootState;

interface ReplaceStateAction {
  type: 'replace-state';
  state: RootState;
}

/** Real Redux and real selectors; no controller or view boundary in this hook. */
const createTestStore = (initialState = createState()) =>
  configureStore<RootState, ReplaceStateAction>({
    reducer: (state: RootState | undefined, action: ReplaceStateAction) =>
      action.type === 'replace-state' ? action.state : (state ?? initialState),
  });

const renderContext = (initialState = createState()) => {
  const store = createTestStore(initialState);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return {
    ...renderHook(() => usePerpsRecoveryContext(), { wrapper }),
    store,
    replaceState: (state: RootState) =>
      store.dispatch({ type: 'replace-state', state }),
  };
};

describe('usePerpsRecoveryContext', () => {
  it('captures the normalized selected wallet, network and provider', () => {
    const { result } = renderContext();

    const issued = result.current.capture();

    expect(issued).toMatchObject({
      address: ACCOUNT_A.toLowerCase(),
      network: 'testnet',
      provider: 'lighter',
    });
    expect(result.current.isCurrent(issued)).toBe(true);
  });

  it.each([
    ['account', createState({ address: ACCOUNT_B })],
    ['network', createState({ isTestnet: false })],
    ['provider', createState({ provider: 'hyperliquid' })],
    ['aggregated provider', createState({ provider: 'aggregated' })],
  ])('invalidates an issuing capture after changing %s', (_change, state) => {
    const { result, replaceState } = renderContext();
    const issued = result.current.capture();

    act(() => {
      replaceState(state);
    });

    expect(result.current.isCurrent(issued)).toBe(false);
    expect(result.current.isCurrent(result.current.capture())).toBe(true);
  });

  it.each([
    ['account', createState({ address: ACCOUNT_B })],
    ['network', createState({ isTestnet: false })],
    ['provider', createState({ provider: 'hyperliquid' })],
  ])(
    'rejects a delayed request after a batched %s A to B to A switch',
    (_change, state) => {
      const { result, replaceState } = renderContext();
      const issued = result.current.capture();
      const isCurrent = result.current.isCurrent;

      act(() => {
        replaceState(state);
        replaceState(createState());
      });

      expect(isCurrent(issued)).toBe(false);
      expect(result.current.capture()?.address).toBe(ACCOUNT_A.toLowerCase());
      expect(result.current.capture()?.epoch).toBeGreaterThan(
        issued?.epoch ?? -1,
      );
    },
  );

  it('invalidates a request synchronously before the next React render', () => {
    const { result, replaceState } = renderContext();
    const issued = result.current.capture();
    const isCurrent = result.current.isCurrent;
    let accepted: boolean | undefined;

    act(() => {
      replaceState(createState({ address: ACCOUNT_B }));
      accepted = isCurrent(issued);
    });

    expect(accepted).toBe(false);
  });

  it('preserves a capture through unrelated Redux changes', () => {
    const { result, replaceState, store } = renderContext();
    const issued = result.current.capture();

    act(() => {
      replaceState({ ...store.getState() });
    });

    expect(result.current.capture()).toBe(issued);
    expect(result.current.isCurrent(issued)).toBe(true);
  });

  it('preserves a capture through an address casing change', () => {
    const { result, replaceState } = renderContext();
    const issued = result.current.capture();

    act(() => {
      replaceState(createState({ address: ACCOUNT_A.toLowerCase() }));
    });

    expect(result.current.capture()).toBe(issued);
    expect(result.current.isCurrent(issued)).toBe(true);
  });

  it('refuses an issuing capture when the selected group has no EVM account', () => {
    const state = createState();
    state.engine.backgroundState.AccountsController.internalAccounts.accounts =
      {};
    const { result } = renderContext(state);

    const issued = result.current.capture();

    expect(issued).toBeUndefined();
    expect(result.current.isCurrent(issued)).toBe(false);
  });

  it('refuses a missing network flag rather than selecting mainnet', () => {
    const state = initialStatePerps()
      .withOverrides({
        engine: {
          backgroundState: {
            PerpsController: {
              isTestnet: undefined,
              activeProvider: 'lighter',
            },
          },
        },
      })
      .build() as RootState;
    const { result } = renderContext(state);

    const issued = result.current.capture();

    expect(issued).toBeUndefined();
    expect(result.current.context.network).toBeUndefined();
  });

  it('refuses a missing provider', () => {
    const state = initialStatePerps()
      .withOverrides({
        engine: {
          backgroundState: {
            PerpsController: { activeProvider: undefined },
          },
        },
      })
      .build() as RootState;
    const { result } = renderContext(state);

    const issued = result.current.capture();

    expect(issued).toBeUndefined();
  });

  it('invalidates captures and removes subscriptions on unmount', () => {
    const store = createTestStore();
    const originalSubscribe = store.subscribe.bind(store);
    const unsubscribes: jest.Mock[] = [];
    jest.spyOn(store, 'subscribe').mockImplementation((listener) => {
      const unsubscribe = jest.fn(originalSubscribe(listener));
      unsubscribes.push(unsubscribe);
      return unsubscribe;
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result, unmount } = renderHook(() => usePerpsRecoveryContext(), {
      wrapper,
    });
    const { capture, isCurrent } = result.current;
    const issued = capture();

    unmount();

    expect(isCurrent(issued)).toBe(false);
    expect(capture()).toBeUndefined();
    expect(unsubscribes.length).toBeGreaterThan(0);
    unsubscribes.forEach((unsubscribe) => {
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  it('rejects callbacks retained from a replaced Redux store', () => {
    const initialStore = createTestStore();
    const replacementStore = createTestStore();
    let selectedStore = initialStore;
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={selectedStore}>{children}</Provider>
    );
    const { result, rerender } = renderHook(() => usePerpsRecoveryContext(), {
      wrapper,
    });
    const { capture, isCurrent } = result.current;
    const issued = capture();

    act(() => {
      selectedStore = replacementStore;
      rerender({});
    });

    const replacementCapture = result.current.capture();
    expect(result.current.isCurrent(issued)).toBe(false);
    expect(result.current.isCurrent(replacementCapture)).toBe(true);
    expect(isCurrent(issued)).toBe(false);
    expect(isCurrent(replacementCapture)).toBe(false);
    expect(capture()).toBeUndefined();
  });

  it('ignores state changes from a replaced Redux store', () => {
    const initialStore = createTestStore();
    const replacementStore = createTestStore();
    let selectedStore = initialStore;
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={selectedStore}>{children}</Provider>
    );
    const { result, rerender } = renderHook(() => usePerpsRecoveryContext(), {
      wrapper,
    });
    act(() => {
      selectedStore = replacementStore;
      rerender({});
    });
    const issued = result.current.capture();

    act(() => {
      initialStore.dispatch({
        type: 'replace-state',
        state: createState({ address: ACCOUNT_B }),
      });
    });

    expect(result.current.capture()).toBe(issued);
    expect(result.current.isCurrent(issued)).toBe(true);
    expect(result.current.context.address).toBe(ACCOUNT_A.toLowerCase());
  });
});
