import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import type {
  PerpsActiveProviderMode,
  PerpsPendingManualRecovery,
  PerpsRecoveredDispatch,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import type { RootState } from '../../../../reducers';
import { initialStatePerps } from '../../../../../tests/component-view/presets/perpsStatePreset';
import { usePerpsRecovery } from './usePerpsRecovery';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PerpsController: {
        getRecoveredDispatches: jest.fn(),
        getPendingManualRecoveries: jest.fn(),
        reconcileRecoveredDispatches: jest.fn(),
        acknowledgeRecoveredDispatch: jest.fn(),
        placeOrder: jest.fn(),
        updatePositionTPSL: jest.fn(),
      },
    },
  },
}));

const ACCOUNT_A = '0x8Dc623E964475D4d669da601Fd15ea9125469003';
const ACCOUNT_B = '0x1234567890123456789012345678901234567890';
const controller = Engine.context.PerpsController;
const getDispatches = jest.mocked(controller.getRecoveredDispatches);
const getProtections = jest.mocked(controller.getPendingManualRecoveries);
const reconcile = jest.mocked(controller.reconcileRecoveredDispatches);

const OLD_DISPATCH: PerpsRecoveredDispatch = {
  recoveryId: 'opaque-dispatch-one',
  apiKeyIndex: 7,
  acknowledgeable: false,
  kind: 14,
  intent: 'placeOrder:ETH:123',
  txHash: null,
  outcome: 'unknown',
  evidence: 'pending',
};
const NEW_DISPATCH: PerpsRecoveredDispatch = {
  ...OLD_DISPATCH,
  recoveryId: 'opaque-dispatch-two',
  acknowledgeable: true,
  outcome: 'succeeded',
  evidence: 'tx-status:2',
};
const PROTECTION: PerpsPendingManualRecovery = {
  symbol: 'ETH',
  settlementKey: 'opaque-protection-source',
  recordedAt: 1_790_000_000_000,
  reason: 'interrupted',
  priorIntent: 'replace',
  survivingOrderIds: ['owned-order-one'],
  actionNeeded: 'review protection',
};

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

const renderRecovery = (initialState = createState()) => {
  const store = configureStore<RootState, ReplaceStateAction>({
    reducer: (state: RootState | undefined, action: ReplaceStateAction) =>
      action.type === 'replace-state' ? action.state : (state ?? initialState),
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return {
    ...renderHook(() => usePerpsRecovery(), { wrapper }),
    replaceState: (state: RootState) =>
      store.dispatch({ type: 'replace-state', state }),
  };
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe('usePerpsRecovery', () => {
  beforeEach(() => {
    Engine.context.PerpsController = controller;
    getDispatches.mockReset().mockResolvedValue([]);
    getProtections.mockReset().mockResolvedValue([]);
    reconcile.mockReset().mockResolvedValue([]);
    jest.mocked(controller.acknowledgeRecoveredDispatch).mockReset();
    jest.mocked(controller.placeOrder).mockReset();
    jest.mocked(controller.updatePositionTPSL).mockReset();
  });

  afterEach(() => {
    Engine.context.PerpsController = controller;
  });

  it('loads both local recovery collections without acknowledging or trading', async () => {
    getDispatches.mockResolvedValue([OLD_DISPATCH]);
    getProtections.mockResolvedValue([PROTECTION]);
    const { result } = renderRecovery();

    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    expect(result.current.dispatches).toEqual([OLD_DISPATCH]);
    expect(result.current.protections).toEqual([PROTECTION]);
    expect(result.current.error).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(reconcile).not.toHaveBeenCalled();
    expect(controller.acknowledgeRecoveredDispatch).not.toHaveBeenCalled();
    expect(controller.placeOrder).not.toHaveBeenCalled();
    expect(controller.updatePositionTPSL).not.toHaveBeenCalled();
  });

  it('distinguishes a completed empty local list from a pending read', async () => {
    const pending = deferred<PerpsRecoveredDispatch[]>();
    getDispatches.mockReturnValueOnce(pending.promise);
    const { result } = renderRecovery();
    await waitFor(() => expect(getDispatches).toHaveBeenCalledTimes(1));
    expect(result.current.hasLoaded).toBe(false);
    expect(result.current.isLoading).toBe(true);

    await act(async () => pending.resolve([]));

    expect(result.current.hasLoaded).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.dispatches).toEqual([]);
  });

  it('preserves both last-known collections when a refresh fails', async () => {
    getDispatches.mockResolvedValue([OLD_DISPATCH]);
    getProtections.mockResolvedValue([PROTECTION]);
    const { result } = renderRecovery();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    getProtections.mockRejectedValueOnce(new Error('unavailable'));

    await act(async () => {
      expect(await result.current.reload()).toBe(false);
    });

    expect(result.current.dispatches).toEqual([OLD_DISPATCH]);
    expect(result.current.protections).toEqual([PROTECTION]);
    expect(result.current.error).toBe('load');
    expect(result.current.hasLoaded).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('requires a completed current list before granting recovery action authority', async () => {
    const pending = deferred<PerpsRecoveredDispatch[]>();
    getDispatches.mockReturnValueOnce(pending.promise);
    getProtections.mockResolvedValue([PROTECTION]);
    const { result } = renderRecovery();
    await waitFor(() => expect(getDispatches).toHaveBeenCalledTimes(1));
    expect(result.current.captureActivity()).toBeUndefined();

    await act(async () => pending.resolve([NEW_DISPATCH]));
    const snapshot = result.current.captureActivity();
    if (snapshot === undefined) {
      throw new Error('Expected completed recovery activity');
    }
    const retainedCapture = result.current.captureActivity;
    expect(snapshot.dispatches).toEqual([NEW_DISPATCH]);
    expect(snapshot.protections).toEqual([PROTECTION]);
    expect(result.current.isActivityCurrent(snapshot)).toBe(true);
    const refresh = deferred<PerpsRecoveredDispatch[]>();
    getDispatches.mockReturnValueOnce(refresh.promise);
    let refreshing: Promise<boolean> | undefined;

    act(() => {
      refreshing = result.current.reload();
      expect(result.current.isActivityCurrent(snapshot)).toBe(false);
      expect(retainedCapture()).toBeUndefined();
    });
    await act(async () => {
      refresh.reject(new Error('unavailable'));
      expect(await refreshing).toBe(false);
    });

    expect(result.current.dispatches).toEqual([NEW_DISPATCH]);
    expect(result.current.protections).toEqual([PROTECTION]);
    expect(result.current.captureActivity()).toBeUndefined();
    expect(result.current.isActivityCurrent(snapshot)).toBe(false);
  });

  it('invalidates reviewed list authority during a batched account A to B to A switch', async () => {
    getDispatches.mockResolvedValue([NEW_DISPATCH]);
    const { result, replaceState } = renderRecovery();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const snapshot = result.current.captureActivity();
    if (snapshot === undefined) {
      throw new Error('Expected completed recovery activity');
    }
    const retainedCapture = result.current.captureActivity;

    act(() => {
      replaceState(createState({ address: ACCOUNT_B }));
      replaceState(createState());
      expect(result.current.isActivityCurrent(snapshot)).toBe(false);
      expect(retainedCapture()).toBeUndefined();
    });
    await waitFor(() => expect(result.current.captureActivity()).toBeDefined());

    expect(getDispatches).toHaveBeenCalledTimes(2);
    expect(result.current.isActivityCurrent(snapshot)).toBe(false);
  });

  it('invalidates reviewed list authority when the owner unmounts', async () => {
    const { result, unmount } = renderRecovery();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const snapshot = result.current.captureActivity();
    if (snapshot === undefined) {
      throw new Error('Expected completed recovery activity');
    }

    unmount();

    expect(result.current.captureActivity()).toBeUndefined();
    expect(result.current.isActivityCurrent(snapshot)).toBe(false);
  });

  it('leaves an unsuccessful first read distinguishable from an empty list', async () => {
    getDispatches.mockRejectedValue(new Error('unavailable'));
    const { result } = renderRecovery();

    await waitFor(() => expect(result.current.error).toBe('load'));

    expect(result.current.hasLoaded).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('clears a refresh error after a completed retry', async () => {
    getDispatches.mockRejectedValueOnce(new Error('unavailable'));
    const { result } = renderRecovery();
    await waitFor(() => expect(result.current.error).toBe('load'));
    getDispatches.mockResolvedValueOnce([NEW_DISPATCH]);

    await act(async () => {
      expect(await result.current.reload()).toBe(true);
    });

    expect(result.current.dispatches).toEqual([NEW_DISPATCH]);
    expect(result.current.hasLoaded).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('lists refreshed activity only after explicit status reconciliation finishes', async () => {
    const pending = deferred<PerpsRecoveredDispatch[]>();
    const { result } = renderRecovery();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    reconcile.mockReturnValueOnce(pending.promise);
    getDispatches.mockResolvedValue([NEW_DISPATCH]);
    let checking: Promise<boolean> | undefined;

    act(() => {
      checking = result.current.checkStatus();
    });
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(getDispatches).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve([NEW_DISPATCH]);
      expect(await checking).toBe(true);
    });

    expect(result.current.dispatches).toEqual([NEW_DISPATCH]);
    expect(result.current.isLoading).toBe(false);
    expect(controller.acknowledgeRecoveredDispatch).not.toHaveBeenCalled();
    expect(controller.placeOrder).not.toHaveBeenCalled();
    expect(controller.updatePositionTPSL).not.toHaveBeenCalled();
  });

  it('preserves local rows when a status check rejects', async () => {
    getDispatches.mockResolvedValue([OLD_DISPATCH]);
    getProtections.mockResolvedValue([PROTECTION]);
    const { result } = renderRecovery();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    reconcile.mockRejectedValueOnce(new Error('status unavailable'));

    await act(async () => {
      expect(await result.current.checkStatus()).toBe(false);
    });

    expect(result.current.error).toBe('status');
    expect(result.current.dispatches).toEqual([OLD_DISPATCH]);
    expect(result.current.protections).toEqual([PROTECTION]);
    expect(getDispatches).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['account', createState({ address: ACCOUNT_B })],
    ['network', createState({ isTestnet: false })],
    ['provider', createState({ provider: 'hyperliquid' })],
  ])('rejects a delayed list after changing %s', async (_change, state) => {
    const pending = deferred<PerpsRecoveredDispatch[]>();
    getDispatches.mockReturnValueOnce(pending.promise);
    const { result, replaceState } = renderRecovery();
    await waitFor(() => expect(getDispatches).toHaveBeenCalledTimes(1));
    getDispatches.mockResolvedValue([NEW_DISPATCH]);

    act(() => replaceState(state));
    await waitFor(() =>
      expect(result.current.dispatches).toEqual([NEW_DISPATCH]),
    );
    await act(async () => pending.resolve([OLD_DISPATCH]));

    expect(result.current.dispatches).toEqual([NEW_DISPATCH]);
    expect(result.current.error).toBeUndefined();
  });

  it('rejects a delayed list after a batched account A to B to A switch', async () => {
    const pending = deferred<PerpsRecoveredDispatch[]>();
    getDispatches.mockReturnValueOnce(pending.promise);
    const { result, replaceState } = renderRecovery();
    await waitFor(() => expect(getDispatches).toHaveBeenCalledTimes(1));
    getDispatches.mockResolvedValue([NEW_DISPATCH]);

    act(() => {
      replaceState(createState({ address: ACCOUNT_B }));
      replaceState(createState());
    });
    await waitFor(() =>
      expect(result.current.dispatches).toEqual([NEW_DISPATCH]),
    );
    await act(async () => pending.resolve([OLD_DISPATCH]));

    expect(result.current.dispatches).toEqual([NEW_DISPATCH]);
  });

  it('rejects an older read after a newer read finishes in the same context', async () => {
    const pending = deferred<PerpsRecoveredDispatch[]>();
    getDispatches.mockReturnValueOnce(pending.promise);
    const { result } = renderRecovery();
    await waitFor(() => expect(getDispatches).toHaveBeenCalledTimes(1));
    getDispatches.mockResolvedValue([NEW_DISPATCH]);

    await act(async () => {
      expect(await result.current.reload()).toBe(true);
    });
    await act(async () => pending.resolve([OLD_DISPATCH]));

    expect(result.current.dispatches).toEqual([NEW_DISPATCH]);
    expect(result.current.error).toBeUndefined();
  });

  it('keeps a newer read pending when an older read rejects', async () => {
    const oldPending = deferred<PerpsRecoveredDispatch[]>();
    const newPending = deferred<PerpsRecoveredDispatch[]>();
    getDispatches.mockReturnValueOnce(oldPending.promise);
    const { result, replaceState } = renderRecovery();
    await waitFor(() => expect(getDispatches).toHaveBeenCalledTimes(1));
    getDispatches.mockReturnValueOnce(newPending.promise);

    act(() => replaceState(createState({ address: ACCOUNT_B })));
    await waitFor(() => expect(getDispatches).toHaveBeenCalledTimes(2));
    await act(async () => oldPending.reject(new Error('old failure')));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeUndefined();
    expect(result.current.hasLoaded).toBe(false);
    await act(async () => newPending.resolve([NEW_DISPATCH]));
    expect(result.current.dispatches).toEqual([NEW_DISPATCH]);
  });

  it('stops a delayed status check before listing a replacement account', async () => {
    const pending = deferred<PerpsRecoveredDispatch[]>();
    const { result, replaceState } = renderRecovery();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    reconcile.mockReturnValueOnce(pending.promise);
    let checking: Promise<boolean> | undefined;

    act(() => {
      checking = result.current.checkStatus();
      replaceState(createState({ address: ACCOUNT_B }));
    });
    await waitFor(() => expect(getDispatches).toHaveBeenCalledTimes(2));
    await act(async () => {
      pending.resolve([]);
      expect(await checking).toBe(false);
    });

    expect(getDispatches).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeUndefined();
  });

  it('refuses callbacks retained from an earlier rendered selection', async () => {
    const { result, replaceState } = renderRecovery();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const { reload, checkStatus } = result.current;
    act(() => replaceState(createState({ address: ACCOUNT_B })));
    await waitFor(() => expect(getDispatches).toHaveBeenCalledTimes(2));

    await act(async () => {
      expect(await reload()).toBe(false);
      expect(await checkStatus()).toBe(false);
    });

    expect(getDispatches).toHaveBeenCalledTimes(2);
    expect(reconcile).not.toHaveBeenCalled();
  });

  it('rejects delayed results from a replaced controller', async () => {
    const pending = deferred<PerpsRecoveredDispatch[]>();
    getDispatches.mockReturnValueOnce(pending.promise);
    const { result, rerender } = renderRecovery();
    await waitFor(() => expect(getDispatches).toHaveBeenCalledTimes(1));
    const replacement = {
      ...controller,
      getRecoveredDispatches: jest.fn(async () => [NEW_DISPATCH]),
      getPendingManualRecoveries: jest.fn(async () => []),
    } satisfies Pick<
      typeof controller,
      'getRecoveredDispatches' | 'getPendingManualRecoveries'
    >;

    act(() => {
      Object.defineProperty(Engine.context, 'PerpsController', {
        configurable: true,
        writable: true,
        value: replacement,
      });
      rerender({});
    });
    await waitFor(() =>
      expect(result.current.dispatches).toEqual([NEW_DISPATCH]),
    );
    await act(async () => pending.resolve([OLD_DISPATCH]));

    expect(result.current.dispatches).toEqual([NEW_DISPATCH]);
    expect(result.current.error).toBeUndefined();
  });

  it('refuses retained callbacks after controller replacement before a render', async () => {
    const { result } = renderRecovery();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const replacement = {
      getRecoveredDispatches: jest.fn(async () => [NEW_DISPATCH]),
      getPendingManualRecoveries: jest.fn(async () => []),
    } satisfies Pick<
      typeof controller,
      'getRecoveredDispatches' | 'getPendingManualRecoveries'
    >;

    Object.defineProperty(Engine.context, 'PerpsController', {
      configurable: true,
      writable: true,
      value: replacement,
    });
    expect(await result.current.reload()).toBe(false);
    expect(await result.current.checkStatus()).toBe(false);

    expect(getDispatches).toHaveBeenCalledTimes(1);
    expect(reconcile).not.toHaveBeenCalled();
    expect(replacement.getRecoveredDispatches).not.toHaveBeenCalled();
    expect(replacement.getPendingManualRecoveries).not.toHaveBeenCalled();
  });

  it('refuses controller calls retained after unmount', async () => {
    const { result, unmount } = renderRecovery();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const { reload, checkStatus } = result.current;

    unmount();
    expect(await reload()).toBe(false);
    expect(await checkStatus()).toBe(false);

    expect(getDispatches).toHaveBeenCalledTimes(1);
    expect(reconcile).not.toHaveBeenCalled();
  });

  it('refuses reads when the network flag is unavailable', async () => {
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
    const { result } = renderRecovery(state);

    expect(await result.current.reload()).toBe(false);
    expect(await result.current.checkStatus()).toBe(false);

    expect(result.current.isAvailable).toBe(false);
    expect(result.current.hasLoaded).toBe(false);
    expect(getDispatches).not.toHaveBeenCalled();
    expect(getProtections).not.toHaveBeenCalled();
    expect(reconcile).not.toHaveBeenCalled();
  });
});
