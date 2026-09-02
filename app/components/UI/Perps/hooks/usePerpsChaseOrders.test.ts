import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  ChaseOrderSuspensionError,
  InitializationState,
  type ChaseOrder,
  type Order,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { PerpsCacheInvalidator } from '../services/PerpsCacheInvalidator';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';
import { reportSuspendedChaseOrders } from '../services/ChaseOrderSuspensionEvents';
import { reportChaseOrderStoreReconciliation } from '../services/ChaseOrderStoreReconciliationEvents';
import { CHASE_ORDER_UI_CONFIG } from '../constants/perpsConfig';
import {
  selectPerpsInitializationState,
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';
import {
  ChaseOrderRequestError,
  isExpectedChaseOrderRequestError,
  resetPerpsChaseOrdersStoreForTests,
  usePerpsChaseOrders,
} from './usePerpsChaseOrders';

let mockSelectedAddress = '0xaccount-a';
let mockPerpsProvider = 'hyperliquid';
let mockPerpsNetwork = 'mainnet';
let mockInitializationState = InitializationState.Initialized;
let mockConnectionIdentityReady = true;
const mockConnectionIdentityListeners = new Set<() => void>();
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      getSelectedAccount: jest.fn(() => ({ address: '0xaccount-a' })),
    },
    PerpsController: {
      getChaseOrders: jest.fn(),
      getOrders: jest.fn(),
      suspendChaseOrders: jest.fn(),
    },
  },
}));

jest.mock('../services/PerpsConnectionManager', () => ({
  PerpsConnectionManager: {
    isSelectedUserContextReady: jest.fn(() => mockConnectionIdentityReady),
    subscribeToInitializedUserContext: jest.fn((listener: () => void) => {
      mockConnectionIdentityListeners.add(listener);
      return () => mockConnectionIdentityListeners.delete(listener);
    }),
  },
}));

jest.mock('../services/ChaseOrderSuspensionEvents', () => ({
  reportSuspendedChaseOrders: jest.fn(),
}));

const mockGetChaseOrders = Engine.context.PerpsController
  .getChaseOrders as jest.Mock;
const mockGetOrders = Engine.context.PerpsController.getOrders as jest.Mock;
const mockSuspendChaseOrders = Engine.context.PerpsController
  .suspendChaseOrders as jest.Mock;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockIsSelectedUserContextReady =
  PerpsConnectionManager.isSelectedUserContextReady as jest.Mock;

const activeOrder = {
  handle: 'chase-1',
  symbol: 'ETH',
  side: 'buy' as const,
  originalSize: '1',
  remainingSize: '1',
  arrivalPrice: '100',
  restingPrice: '101',
  restingOrderId: 'order-1',
  distanceChasedBps: 1,
  repricings: 0,
  startedAt: 1,
  status: 'active' as const,
};
const primaryProvider = 'primary-provider' as PerpsProviderType;
const secondaryProvider = 'secondary-provider' as PerpsProviderType;
const makeHistoricalOrder = (overrides: Partial<Order> = {}): Order => ({
  orderId: 'order-1',
  symbol: 'ETH',
  side: 'buy',
  orderType: 'limit',
  size: '1',
  originalSize: '1',
  price: '101',
  filledSize: '1',
  remainingSize: '0',
  status: 'filled',
  timestamp: 2,
  ...overrides,
});

const exhaustDiscoveryRetries = async () => {
  for (
    let attempt = 1;
    attempt < CHASE_ORDER_UI_CONFIG.DiscoveryRetryMaxAttempts;
    attempt += 1
  ) {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        Math.min(
          CHASE_ORDER_UI_CONFIG.RefreshIntervalMs * 2 ** (attempt - 1),
          CHASE_ORDER_UI_CONFIG.DiscoveryRetryMaxDelayMs,
        ),
      );
    });
  }
};

describe('usePerpsChaseOrders', () => {
  beforeEach(() => {
    resetPerpsChaseOrdersStoreForTests();
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetChaseOrders.mockResolvedValue([]);
    mockGetOrders.mockResolvedValue([]);
    mockSuspendChaseOrders.mockResolvedValue([]);
    mockSelectedAddress = '0xaccount-a';
    mockPerpsProvider = 'hyperliquid';
    mockPerpsNetwork = 'mainnet';
    mockInitializationState = InitializationState.Initialized;
    mockConnectionIdentityReady = true;
    mockConnectionIdentityListeners.clear();
    mockIsSelectedUserContextReady.mockImplementation(
      () => mockConnectionIdentityReady,
    );
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectPerpsProvider) return mockPerpsProvider;
      if (selector === selectPerpsNetwork) return mockPerpsNetwork;
      if (selector === selectPerpsInitializationState) {
        return mockInitializationState;
      }
      return undefined;
    });
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => 'active',
    });
    PerpsCacheInvalidator.invalidate('accountState');
  });

  afterEach(() => {
    resetPerpsChaseOrdersStoreForTests();
    jest.useRealTimers();
  });

  it('clears polling when the last Chase consumer unmounts', async () => {
    mockGetChaseOrders.mockResolvedValueOnce([activeOrder]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));
    expect(jest.getTimerCount()).toBeGreaterThan(0);

    hook.unmount();

    expect(jest.getTimerCount()).toBe(0);
  });

  it('stops polling while blurred and restores one interval on refocus', async () => {
    mockGetChaseOrders.mockResolvedValue([activeOrder]);
    const backgroundConsumer = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: false, enableDiscovery: true }),
    );
    const screenConsumer = renderHook(
      ({ isFocused }: { isFocused: boolean }) =>
        usePerpsChaseOrders({
          isEnabled: isFocused,
          enableDiscovery: false,
        }),
      { initialProps: { isFocused: true } },
    );
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));
    expect(jest.getTimerCount()).toBeGreaterThan(0);

    screenConsumer.rerender({ isFocused: false });

    expect(jest.getTimerCount()).toBe(0);
    const callsWhileBlurred = mockGetChaseOrders.mock.calls.length;
    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.RefreshIntervalMs * 2,
      );
    });
    expect(mockGetChaseOrders).toHaveBeenCalledTimes(callsWhileBlurred);

    screenConsumer.rerender({ isFocused: true });
    await waitFor(() =>
      expect(mockGetChaseOrders.mock.calls.length).toBeGreaterThan(
        callsWhileBlurred,
      ),
    );
    const callsAfterRefocus = mockGetChaseOrders.mock.calls.length;
    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.RefreshIntervalMs,
      );
    });
    expect(mockGetChaseOrders).toHaveBeenCalledTimes(callsAfterRefocus + 1);
    screenConsumer.unmount();
    backgroundConsumer.unmount();
  });

  it('does not discover or retry from a blurred screen consumer', async () => {
    mockGetChaseOrders.mockRejectedValue(new Error('provider unavailable'));
    const screenConsumer = renderHook(
      ({ isFocused }: { isFocused: boolean }) =>
        usePerpsChaseOrders({
          isEnabled: isFocused,
          enableDiscovery: false,
        }),
      { initialProps: { isFocused: true } },
    );
    await act(async () => Promise.resolve());

    screenConsumer.rerender({ isFocused: false });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.DiscoveryRetryMaxDelayMs * 2,
      );
    });

    expect(mockGetChaseOrders).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
    screenConsumer.unmount();
  });

  it.each(['context_not_ready', 'stale_request'] as const)(
    'recognizes %s as an expected Chase request race',
    (code) => {
      const error = new ChaseOrderRequestError(code);

      const result = isExpectedChaseOrderRequestError(error);

      expect(result).toBe(true);
      expect(error.code).toBe(code);
    },
  );

  it('evicts an aggregated Chase after consecutive authoritative omissions', async () => {
    mockPerpsProvider = 'aggregated';
    mockGetChaseOrders
      .mockResolvedValueOnce([activeOrder])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() => {
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]);
      expect(hook.result.current.isChaseOrderDiscoveryResolved).toBe(true);
    });

    await act(async () => hook.result.current.getChaseOrders());
    expect(mockGetChaseOrders).toHaveBeenCalledTimes(2);
    expect(hook.result.current.chaseOrders).toEqual([activeOrder]);

    await act(async () => hook.result.current.getChaseOrders());
    expect(mockGetChaseOrders).toHaveBeenCalledTimes(3);
    await waitFor(() => expect(hook.result.current.chaseOrders).toEqual([]));

    const orders = hook.result.current.chaseOrders;
    const isDiscoveryResolved =
      hook.result.current.isChaseOrderDiscoveryResolved;
    hook.unmount();

    expect(orders).toEqual([]);
    expect(isDiscoveryResolved).toBe(true);
  });

  it('clears an aggregated omission miss when the provider recovers', async () => {
    const providerOrder = {
      ...activeOrder,
      providerId: primaryProvider,
    };
    mockPerpsProvider = 'aggregated';
    mockGetChaseOrders
      .mockResolvedValueOnce([providerOrder])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([providerOrder])
      .mockResolvedValueOnce([]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([providerOrder]),
    );

    await act(async () => hook.result.current.getChaseOrders());
    expect(hook.result.current.chaseOrders).toEqual([providerOrder]);
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    await act(async () => hook.result.current.getChaseOrders());
    expect(hook.result.current.chaseOrders).toEqual([providerOrder]);
    await act(async () => hook.result.current.getChaseOrders());

    expect(hook.result.current.chaseOrders).toEqual([providerOrder]);
    hook.unmount();
  });

  it('reconciles an external suspension report for the selected route', async () => {
    const backgroundedOrder = {
      ...activeOrder,
      status: 'backgrounded' as const,
    };
    mockGetChaseOrders
      .mockResolvedValueOnce([activeOrder])
      .mockResolvedValueOnce([backgroundedOrder]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
    );

    act(() => {
      reportChaseOrderStoreReconciliation({
        orders: [backgroundedOrder],
        route: {
          account: mockSelectedAddress,
          provider: mockPerpsProvider,
          network: mockPerpsNetwork,
        },
      });
    });

    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([backgroundedOrder]),
    );
    expect(mockGetChaseOrders).toHaveBeenCalledTimes(2);
    hook.unmount();
  });

  it('ignores an external suspension report from an old route', async () => {
    const backgroundedOrder = {
      ...activeOrder,
      status: 'backgrounded' as const,
    };
    mockGetChaseOrders.mockResolvedValueOnce([activeOrder]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
    );

    act(() => {
      reportChaseOrderStoreReconciliation({
        orders: [backgroundedOrder],
        route: {
          account: mockSelectedAddress,
          provider: secondaryProvider,
          network: mockPerpsNetwork,
        },
      });
    });
    await act(async () => Promise.resolve());

    expect(hook.result.current.chaseOrders).toEqual([activeOrder]);
    expect(mockGetChaseOrders).toHaveBeenCalledTimes(1);
    hook.unmount();
  });

  it('shares one refresh request and polling interval across consumers', async () => {
    let resolveRefresh: ((orders: (typeof activeOrder)[]) => void) | undefined;
    mockGetChaseOrders.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    const first = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    const second = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));

    expect(mockGetChaseOrders).toHaveBeenCalledTimes(1);
    await act(async () => resolveRefresh?.([activeOrder]));

    expect(first.result.current.chaseOrders).toEqual([activeOrder]);
    expect(second.result.current.chaseOrders).toEqual([activeOrder]);

    await act(async () => {
      jest.advanceTimersByTime(CHASE_ORDER_UI_CONFIG.RefreshIntervalMs);
      await Promise.resolve();
    });
    expect(mockGetChaseOrders).toHaveBeenCalledTimes(2);

    first.unmount();
    second.unmount();
  });

  it('keeps the shared snapshot stable when polling returns unchanged orders', async () => {
    mockGetChaseOrders.mockResolvedValue([{ ...activeOrder }]);
    let renderCount = 0;
    const hook = renderHook(() => {
      renderCount += 1;
      return usePerpsChaseOrders({ isEnabled: true });
    });
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
    );
    const stableOrders = hook.result.current.chaseOrders;
    const settledRenderCount = renderCount;

    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.RefreshIntervalMs,
      );
    });

    expect(mockGetChaseOrders).toHaveBeenCalledTimes(2);
    expect(hook.result.current.chaseOrders).toBe(stableOrders);
    expect(renderCount).toBe(settledRenderCount);
    hook.unmount();
  });

  it('shares one failed discovery and one retry timer across consumers', async () => {
    const loggerError = jest.spyOn(Logger, 'error').mockImplementation();
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    let rejectDiscovery: ((error: Error) => void) | undefined;
    mockGetChaseOrders
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectDiscovery = reject;
          }),
      )
      .mockResolvedValueOnce([]);
    const first = renderHook(() => usePerpsChaseOrders({ isEnabled: false }));
    const second = renderHook(() => usePerpsChaseOrders({ isEnabled: false }));

    await act(async () =>
      rejectDiscovery?.(new Error('shared discovery failure')),
    );

    expect(mockGetChaseOrders).toHaveBeenCalledTimes(1);
    expect(
      setTimeoutSpy.mock.calls.filter(
        ([, delay]) => delay === CHASE_ORDER_UI_CONFIG.RefreshIntervalMs,
      ),
    ).toHaveLength(1);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.RefreshIntervalMs,
      );
    });

    expect(mockGetChaseOrders).toHaveBeenCalledTimes(2);
    first.unmount();
    second.unmount();
    setTimeoutSpy.mockRestore();
    loggerError.mockRestore();
  });

  it('ignores a superseded discovery failure without replacing the current retry', async () => {
    const loggerError = jest.spyOn(Logger, 'error').mockImplementation();
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    let rejectOldDiscovery: ((error: Error) => void) | undefined;
    let rejectCurrentDiscovery: ((error: Error) => void) | undefined;
    mockGetChaseOrders
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectOldDiscovery = reject;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectCurrentDiscovery = reject;
          }),
      )
      .mockResolvedValueOnce([]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: false }));
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));

    mockConnectionIdentityReady = false;
    await act(async () =>
      mockConnectionIdentityListeners.forEach((listener) => listener()),
    );
    mockConnectionIdentityReady = true;
    await act(async () =>
      mockConnectionIdentityListeners.forEach((listener) => listener()),
    );
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));
    setTimeoutSpy.mockClear();
    await act(async () =>
      rejectOldDiscovery?.(new Error('superseded discovery failure')),
    );

    expect(
      setTimeoutSpy.mock.calls.filter(
        ([, delay]) => delay === CHASE_ORDER_UI_CONFIG.RefreshIntervalMs,
      ),
    ).toHaveLength(0);

    await act(async () =>
      rejectCurrentDiscovery?.(new Error('current discovery failure')),
    );
    expect(
      setTimeoutSpy.mock.calls.filter(
        ([, delay]) => delay === CHASE_ORDER_UI_CONFIG.RefreshIntervalMs,
      ),
    ).toHaveLength(1);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.RefreshIntervalMs,
      );
    });

    expect(mockGetChaseOrders).toHaveBeenCalledTimes(3);
    hook.unmount();
    setTimeoutSpy.mockRestore();
    loggerError.mockRestore();
  });

  it('waits for controller initialization before discovering retained orders', async () => {
    mockInitializationState = InitializationState.Uninitialized;
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: false }));

    expect(mockGetChaseOrders).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(CHASE_ORDER_UI_CONFIG.RefreshIntervalMs);
      await Promise.resolve();
    });
    expect(mockGetChaseOrders).not.toHaveBeenCalled();

    mockInitializationState = InitializationState.Initialized;
    hook.rerender({});

    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));
    hook.unmount();
  });

  it.each([
    'backgrounded',
    'max_distance_reached',
    'duration_reached',
    'repricing_limit_reached',
  ] as const)(
    'preserves terminal %s history without polling while rollout is off',
    async (status) => {
      const terminalOrder = { ...activeOrder, status };
      mockGetChaseOrders.mockResolvedValueOnce([terminalOrder]);
      const { result, unmount } = renderHook(() =>
        usePerpsChaseOrders({ isEnabled: false }),
      );
      await waitFor(() => {
        expect(result.current.chaseOrders).toEqual([terminalOrder]);
      });

      await act(async () => {
        jest.advanceTimersByTime(CHASE_ORDER_UI_CONFIG.RefreshIntervalMs);
        await Promise.resolve();
      });

      expect(mockGetChaseOrders).toHaveBeenCalledTimes(1);
      expect(result.current.hasLiveChaseOrders).toBe(false);
      unmount();
    },
  );

  it('keeps one-shot retained discovery off the 1 Hz polling loop', async () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const { result, unmount } = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: false, enableDiscovery: true }),
    );
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));

    expect(result.current.chaseOrders).toEqual([]);
    expect(result.current.hasLiveChaseOrders).toBe(false);
    expect(result.current.isChaseOrderDiscoveryResolved).toBe(true);
    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(PerpsCacheInvalidator.getSubscriberCount('accountState')).toBe(0);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.RefreshIntervalMs * 3,
      );
    });
    expect(mockGetChaseOrders).toHaveBeenCalledTimes(1);
    unmount();
    setIntervalSpy.mockRestore();
  });

  it('does not poll retained wallet-root sessions without a screen consumer', async () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    mockGetChaseOrders.mockResolvedValueOnce([activeOrder]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: false }));

    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
    );

    expect(setIntervalSpy).not.toHaveBeenCalled();
    hook.unmount();
    setIntervalSpy.mockRestore();
  });

  it('does not poll a Pro screen with zero Chase orders', async () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));

    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));

    expect(hook.result.current.chaseOrders).toEqual([]);
    expect(setIntervalSpy).not.toHaveBeenCalled();
    hook.unmount();
    setIntervalSpy.mockRestore();
  });

  it('does not poll a Pro screen with terminal Chase history only', async () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const terminalOrder = { ...activeOrder, status: 'filled' as const };
    mockGetChaseOrders.mockResolvedValueOnce([terminalOrder]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));

    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([terminalOrder]),
    );

    expect(hook.result.current.hasLiveChaseOrders).toBe(false);
    expect(setIntervalSpy).not.toHaveBeenCalled();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.RefreshIntervalMs * 2,
      );
    });
    expect(mockGetChaseOrders).toHaveBeenCalledTimes(1);
    hook.unmount();
    setIntervalSpy.mockRestore();
  });

  it('arms screen polling after a fresh placement read returns an order', async () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    mockGetChaseOrders
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([activeOrder]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));

    await act(async () => hook.result.current.getChaseOrders());

    expect(hook.result.current.chaseOrders).toEqual([activeOrder]);
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    hook.unmount();
    setIntervalSpy.mockRestore();
  });

  it('marks a rollout falling edge unresolved until retained discovery settles', async () => {
    let resolveRollbackDiscovery: ((orders: []) => void) | undefined;
    mockGetChaseOrders.mockResolvedValueOnce([]).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRollbackDiscovery = resolve;
        }),
    );
    let isEnabled = true;
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled }));
    await waitFor(() =>
      expect(hook.result.current.isChaseOrderDiscoveryResolved).toBe(true),
    );

    isEnabled = false;
    act(() => hook.rerender({}));

    expect(hook.result.current.isChaseOrderDiscoveryResolved).toBe(false);
    expect(mockGetChaseOrders).toHaveBeenCalledTimes(2);

    await act(async () => resolveRollbackDiscovery?.([]));

    await waitFor(() =>
      expect(hook.result.current.isChaseOrderDiscoveryResolved).toBe(true),
    );
    expect(hook.result.current.hasLiveChaseOrders).toBe(false);
    hook.unmount();
  });

  it('keeps account-scoped orders until invalidation refresh settles', async () => {
    mockGetChaseOrders.mockResolvedValueOnce([activeOrder]);
    const { result, unmount } = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: true }),
    );
    await waitFor(() =>
      expect(result.current.chaseOrders).toEqual([activeOrder]),
    );

    let resolveRefresh: ((orders: []) => void) | undefined;
    mockGetChaseOrders.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    act(() => PerpsCacheInvalidator.invalidate('accountState'));

    expect(result.current.chaseOrders).toEqual([activeOrder]);
    await act(async () => resolveRefresh?.([]));
    expect(result.current.chaseOrders).toEqual([]);
    unmount();
  });

  it('updates the shared snapshot after suspending Chase orders', async () => {
    mockSuspendChaseOrders.mockResolvedValueOnce([activeOrder]);
    const { result, unmount } = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: true }),
    );

    await act(async () => {
      await result.current.suspendChaseOrders();
    });

    expect(result.current.chaseOrders).toEqual([activeOrder]);
    unmount();
  });

  it('reconciles a partial suspension and retries failed providers', async () => {
    const primaryActive = { ...activeOrder, providerId: primaryProvider };
    const secondaryActive = {
      ...activeOrder,
      handle: 'chase-secondary',
      providerId: secondaryProvider,
    };
    const primarySuspended = {
      ...primaryActive,
      status: 'backgrounded' as const,
    };
    const secondarySuspended = {
      ...secondaryActive,
      status: 'backgrounded' as const,
    };
    mockGetChaseOrders.mockResolvedValueOnce([primaryActive, secondaryActive]);
    mockSuspendChaseOrders
      .mockRejectedValueOnce(
        new ChaseOrderSuspensionError({
          suspendedOrders: [primarySuspended],
          failures: [
            {
              providerId: secondaryProvider,
              reason: new Error('secondary provider failed'),
            },
          ],
        }),
      )
      .mockResolvedValueOnce([primarySuspended, secondarySuspended]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([
        primaryActive,
        secondaryActive,
      ]),
    );

    let suspendedOrders: ChaseOrder[] = [];
    await act(async () => {
      suspendedOrders = await hook.result.current.suspendChaseOrders();
    });

    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(2);
    expect(suspendedOrders).toEqual([primarySuspended, secondarySuspended]);
    expect(hook.result.current.chaseOrders).toEqual([
      expect.objectContaining(primarySuspended),
      expect.objectContaining(secondarySuspended),
    ]);
    hook.unmount();
  });

  it('preserves partial suspension details after a generic retry failure', async () => {
    const suspendedOrder = {
      ...activeOrder,
      providerId: primaryProvider,
      status: 'backgrounded' as const,
    };
    const retryError = new Error('retry failed');
    mockGetChaseOrders.mockResolvedValueOnce([activeOrder]);
    mockSuspendChaseOrders
      .mockRejectedValueOnce(
        new ChaseOrderSuspensionError({
          suspendedOrders: [suspendedOrder],
          failures: [
            {
              providerId: secondaryProvider,
              reason: new Error('secondary provider failed'),
            },
          ],
        }),
      )
      .mockRejectedValueOnce(retryError);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
    );

    let result: unknown;
    await act(async () => {
      result = await hook.result.current
        .suspendChaseOrders()
        .catch((error) => error);
    });

    expect(result).toBeInstanceOf(ChaseOrderSuspensionError);
    expect((result as ChaseOrderSuspensionError).suspendedOrders).toEqual([
      suspendedOrder,
    ]);
    expect((result as ChaseOrderSuspensionError).failures[0].reason).toBe(
      retryError,
    );
    expect(hook.result.current.chaseOrders).toEqual([
      expect.objectContaining(suspendedOrder),
    ]);
    hook.unmount();
  });

  it('reconciles a late retry after a partial suspension times out', async () => {
    let currentAppState = 'active';
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => currentAppState,
    });
    const partialOrder = {
      ...activeOrder,
      providerId: primaryProvider,
      status: 'backgrounded' as const,
    };
    const freshOrder = {
      ...activeOrder,
      handle: 'chase-fresh-after-partial-timeout',
      providerId: secondaryProvider,
      status: 'backgrounded' as const,
    };
    let resolveRetry: ((orders: (typeof freshOrder)[]) => void) | undefined;
    mockGetChaseOrders
      .mockResolvedValueOnce([activeOrder])
      .mockResolvedValueOnce([freshOrder]);
    mockSuspendChaseOrders
      .mockRejectedValueOnce(
        new ChaseOrderSuspensionError({
          suspendedOrders: [partialOrder],
          failures: [
            {
              providerId: secondaryProvider,
              reason: new Error('secondary provider failed'),
            },
          ],
        }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRetry = resolve;
          }),
      );
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
    );
    currentAppState = 'background';

    const suspensionResult = hook.result.current
      .suspendChaseOrders()
      .catch((error) => error);
    await act(async () => Promise.resolve());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.BackgroundSuspensionTimeoutMs,
      );
    });

    const timeoutResult = await suspensionResult;
    expect(timeoutResult).toBeInstanceOf(ChaseOrderSuspensionError);
    expect(timeoutResult.suspendedOrders).toEqual([partialOrder]);
    await act(async () => resolveRetry?.([freshOrder]));
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([
        partialOrder,
        freshOrder,
      ]),
    );
    hook.unmount();
  });

  it('skips a queued suspension after its lifecycle becomes stale', async () => {
    const queuedOrder = { ...activeOrder, handle: 'chase-queued' };
    const foregroundOrder = { ...activeOrder, handle: 'chase-foreground' };
    let resolveFirstRead:
      | ((orders: (typeof activeOrder)[]) => void)
      | undefined;
    let resolveQueuedRead:
      | ((orders: (typeof queuedOrder)[]) => void)
      | undefined;
    let resolveForegroundRead:
      | ((orders: (typeof foregroundOrder)[]) => void)
      | undefined;
    mockGetChaseOrders
      .mockResolvedValueOnce([])
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstRead = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveQueuedRead = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveForegroundRead = resolve;
          }),
      );
    const { result, unmount } = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: true }),
    );
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));
    let isCurrentLifecycle = true;

    const firstReadPromise = result.current.getChaseOrders();
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));
    const queuedReadPromise = result.current.getChaseOrders();
    const suspensionPromise = result.current.suspendChaseOrders(
      () => isCurrentLifecycle,
    );
    isCurrentLifecycle = false;
    const foregroundReadPromise = result.current.getChaseOrders();
    await act(async () => Promise.resolve());

    expect(mockGetChaseOrders).toHaveBeenCalledTimes(2);
    await act(async () => resolveFirstRead?.([activeOrder]));
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(3));
    await act(async () => resolveQueuedRead?.([queuedOrder]));
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(4));
    await act(async () => resolveForegroundRead?.([foregroundOrder]));

    await expect(firstReadPromise).resolves.toEqual([activeOrder]);
    await expect(queuedReadPromise).resolves.toEqual([queuedOrder]);
    await expect(suspensionPromise).resolves.toEqual([]);
    await expect(foregroundReadPromise).resolves.toEqual([foregroundOrder]);

    expect(mockSuspendChaseOrders).not.toHaveBeenCalled();
    expect(result.current.chaseOrders).toEqual([foregroundOrder]);
    unmount();
  });

  it('invalidates an already queued refresh before suspension caches its result', async () => {
    const suspendedOrder = { ...activeOrder, status: 'backgrounded' as const };
    let resolveFirstRefresh:
      | ((orders: (typeof activeOrder)[]) => void)
      | undefined;
    let resolveSuspension:
      | ((orders: (typeof suspendedOrder)[]) => void)
      | undefined;
    mockGetChaseOrders.mockResolvedValueOnce([]).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirstRefresh = resolve;
        }),
    );
    mockSuspendChaseOrders.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSuspension = resolve;
        }),
    );
    const { result, unmount } = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: true }),
    );
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));

    const firstRefreshResult = result.current
      .getChaseOrders()
      .catch((error) => error);
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));
    const queuedRefreshResult = result.current
      .getChaseOrders()
      .catch((error) => error);
    const suspensionResult = result.current.suspendChaseOrders();
    await act(async () => Promise.resolve());
    await act(async () => resolveFirstRefresh?.([activeOrder]));
    await act(async () => resolveSuspension?.([suspendedOrder]));

    const firstRefreshValue = await firstRefreshResult;
    const queuedRefreshValue = await queuedRefreshResult;
    const suspensionValue = await suspensionResult;
    const controllerCallCount = mockGetChaseOrders.mock.calls.length;
    const orders = result.current.chaseOrders;
    unmount();

    expect(firstRefreshValue).toEqual(
      new Error('Chase order request became stale'),
    );
    expect(queuedRefreshValue).toEqual(
      new Error('Chase order request became stale'),
    );
    expect(suspensionValue).toEqual([suspendedOrder]);
    expect(controllerCallCount).toBe(2);
    expect(orders).toEqual([suspendedOrder]);
  });

  it('times out suspension while a preceding refresh blocks the mutation queue', async () => {
    let currentAppState = 'active';
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => currentAppState,
    });
    let resolveRefresh: ((orders: []) => void) | undefined;
    mockGetChaseOrders.mockResolvedValueOnce([]).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    mockSuspendChaseOrders.mockImplementationOnce(
      () => new Promise(() => undefined),
    );
    const { result, unmount } = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: true }),
    );
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));
    currentAppState = 'background';

    let refreshResult: Promise<unknown> = Promise.resolve();
    act(() => {
      refreshResult = result.current.getChaseOrders().catch((error) => error);
    });
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));
    const suspensionResult = result.current
      .suspendChaseOrders()
      .catch((error) => error);
    await act(async () => Promise.resolve());

    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(1);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.BackgroundSuspensionTimeoutMs,
      );
    });

    expect(await suspensionResult).toEqual(
      new Error('Chase mutation timed out'),
    );

    await act(async () => resolveRefresh?.([]));
    expect(await refreshResult).toEqual(
      new Error('Chase order request became stale'),
    );
    unmount();
  });

  it('detaches hung pre-suspension reads after the suspension timeout', async () => {
    let currentAppState = 'active';
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => currentAppState,
    });
    const foregroundOrder = { ...activeOrder, handle: 'chase-foreground' };
    let resolveFirstRefresh: ((orders: []) => void) | undefined;
    mockGetChaseOrders
      .mockResolvedValueOnce([])
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstRefresh = resolve;
          }),
      )
      .mockResolvedValueOnce([foregroundOrder]);
    mockSuspendChaseOrders.mockImplementationOnce(
      () => new Promise(() => undefined),
    );
    const { result, unmount } = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: true }),
    );
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));
    currentAppState = 'background';

    const firstRefreshResult = result.current
      .getChaseOrders()
      .catch((error) => error);
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));
    const queuedRefreshResult = result.current
      .getChaseOrders()
      .catch((error) => error);
    const suspensionResult = result.current
      .suspendChaseOrders()
      .catch((error) => error);
    await act(async () => Promise.resolve());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.BackgroundSuspensionTimeoutMs,
      );
    });
    const suspensionValue = await suspensionResult;

    currentAppState = 'active';
    let foregroundRefreshResult: Promise<unknown> = Promise.resolve([]);
    let foregroundRefreshStartedBeforeOldQueueSettled = false;
    await act(async () => {
      foregroundRefreshResult = result.current.getChaseOrders();
      await Promise.resolve();
      await Promise.resolve();
      foregroundRefreshStartedBeforeOldQueueSettled =
        mockGetChaseOrders.mock.calls.length === 3;
    });
    await act(async () => resolveFirstRefresh?.([]));

    const firstRefreshValue = await firstRefreshResult;
    const queuedRefreshValue = await queuedRefreshResult;
    const foregroundRefreshValue = await foregroundRefreshResult;
    const controllerCallCount = mockGetChaseOrders.mock.calls.length;
    const orders = result.current.chaseOrders;
    unmount();

    expect(foregroundRefreshStartedBeforeOldQueueSettled).toBe(true);
    expect(suspensionValue).toEqual(new Error('Chase mutation timed out'));
    expect(firstRefreshValue).toEqual(
      new Error('Chase order request became stale'),
    );
    expect(queuedRefreshValue).toEqual(
      new Error('Chase order request became stale'),
    );
    expect(foregroundRefreshValue).toEqual([foregroundOrder]);
    expect(controllerCallCount).toBe(3);
    expect(orders).toEqual([foregroundOrder]);
  });

  it('releases the mutation queue after suspension times out', async () => {
    let currentAppState = 'active';
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => currentAppState,
    });
    mockSuspendChaseOrders.mockImplementationOnce(
      () => new Promise(() => undefined),
    );
    mockGetChaseOrders.mockResolvedValue([]);
    const { result, unmount } = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: true }),
    );
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));
    currentAppState = 'background';

    const suspensionPromise = result.current.suspendChaseOrders();
    const suspensionResult = suspensionPromise.catch((error) => error);
    await act(async () => Promise.resolve());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.BackgroundSuspensionTimeoutMs,
      );
    });
    expect(await suspensionResult).toEqual(
      new Error('Chase mutation timed out'),
    );

    const readsBeforeRecovery = mockGetChaseOrders.mock.calls.length;
    let recoveredOrders: unknown;
    await act(async () => {
      recoveredOrders = await result.current.getChaseOrders();
    });

    expect(recoveredOrders).toEqual([]);
    expect(mockGetChaseOrders.mock.calls.length).toBeGreaterThan(
      readsBeforeRecovery,
    );
    unmount();
  });

  it('reports a partial suspension that rejects after the hook timeout', async () => {
    let currentAppState = 'active';
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => currentAppState,
    });
    const partialOrder = {
      ...activeOrder,
      handle: 'chase-late-partial',
      status: 'backgrounded' as const,
    };
    let rejectSuspension: ((error: Error) => void) | undefined;
    mockGetChaseOrders
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([partialOrder]);
    mockSuspendChaseOrders.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectSuspension = reject;
        }),
    );
    const loggerError = jest.spyOn(Logger, 'error').mockImplementation();
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));
    currentAppState = 'background';
    const suspensionResult = hook.result.current
      .suspendChaseOrders()
      .catch((error) => error);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.BackgroundSuspensionTimeoutMs,
      );
    });
    expect(await suspensionResult).toEqual(
      new Error('Chase mutation timed out'),
    );

    await act(async () => {
      rejectSuspension?.(
        new ChaseOrderSuspensionError({
          suspendedOrders: [partialOrder],
          failures: [
            {
              providerId: secondaryProvider,
              reason: new Error('late provider failure'),
            },
          ],
        }),
      );
      await Promise.resolve();
    });

    expect(reportSuspendedChaseOrders).toHaveBeenCalledTimes(1);
    expect(reportSuspendedChaseOrders).toHaveBeenCalledWith([partialOrder]);
    expect(loggerError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({
          name: 'usePerpsChaseOrders.lateSuspension',
        }),
      }),
    );
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));
    hook.unmount();
    loggerError.mockRestore();
  });

  it.each(['late-first', 'newer-first'] as const)(
    'keeps the newer suspension authoritative when overlapping results settle %s',
    async (order) => {
      let currentAppState = 'active';
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        get: () => currentAppState,
      });
      const lateOrder = {
        ...activeOrder,
        handle: 'chase-overlap-late',
        status: 'backgrounded' as const,
      };
      const newerOrder = {
        ...activeOrder,
        handle: 'chase-overlap-newer',
        status: 'backgrounded' as const,
      };
      let resolveLate: ((orders: (typeof lateOrder)[]) => void) | undefined;
      let resolveNewer: ((orders: (typeof newerOrder)[]) => void) | undefined;
      mockGetChaseOrders.mockResolvedValueOnce([]);
      mockSuspendChaseOrders
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveLate = resolve;
            }),
        )
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveNewer = resolve;
            }),
        );
      const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
      await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));
      currentAppState = 'background';
      const lateResult = hook.result.current
        .suspendChaseOrders()
        .catch((error) => error);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(
          CHASE_ORDER_UI_CONFIG.BackgroundSuspensionTimeoutMs,
        );
      });
      expect(await lateResult).toEqual(new Error('Chase mutation timed out'));

      const newerResult = hook.result.current.suspendChaseOrders();
      await act(async () => Promise.resolve());
      if (order === 'late-first') {
        await act(async () => resolveLate?.([lateOrder]));
        await act(async () => resolveNewer?.([newerOrder]));
      } else {
        await act(async () => resolveNewer?.([newerOrder]));
        await act(async () => resolveLate?.([lateOrder]));
      }
      await newerResult;
      await act(async () => Promise.resolve());

      expect(hook.result.current.chaseOrders).toEqual([newerOrder]);
      expect(mockGetChaseOrders).toHaveBeenCalledTimes(1);
      expect(reportSuspendedChaseOrders).toHaveBeenCalledTimes(1);
      expect(reportSuspendedChaseOrders).toHaveBeenCalledWith([lateOrder]);
      hook.unmount();
    },
  );

  it('reconciles a late suspension with a fresh identity-checked read', async () => {
    let currentAppState = 'active';
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => currentAppState,
    });
    const lateOrder = {
      ...activeOrder,
      handle: 'chase-late-result',
      status: 'backgrounded' as const,
    };
    const freshOrder = {
      ...activeOrder,
      handle: 'chase-fresh-read',
      status: 'backgrounded' as const,
    };
    let resolveSuspension: ((orders: (typeof lateOrder)[]) => void) | undefined;
    let resolveFreshRead: ((orders: (typeof freshOrder)[]) => void) | undefined;
    mockGetChaseOrders.mockResolvedValueOnce([]).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFreshRead = resolve;
        }),
    );
    mockSuspendChaseOrders.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSuspension = resolve;
        }),
    );
    const lifecycle = { current: true };
    const { result, unmount } = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: true }),
    );
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));
    currentAppState = 'background';

    const suspensionResult = result.current
      .suspendChaseOrders(() => lifecycle.current)
      .catch((error) => error);
    await act(async () => Promise.resolve());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.BackgroundSuspensionTimeoutMs,
      );
    });
    lifecycle.current = false;
    await act(async () => resolveSuspension?.([lateOrder]));
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));

    expect(reportSuspendedChaseOrders).toHaveBeenCalledWith([lateOrder]);
    expect(await suspensionResult).toEqual(
      new Error('Chase mutation timed out'),
    );
    expect(result.current.isChaseOrderDiscoveryResolved).toBe(false);

    await act(async () => resolveFreshRead?.([freshOrder]));

    await waitFor(() =>
      expect(result.current.chaseOrders).toEqual([freshOrder]),
    );
    expect(result.current.isChaseOrderDiscoveryResolved).toBe(true);
    expect(result.current.chaseOrders).not.toContainEqual(lateOrder);
    unmount();
  });

  it('keeps failed late reconciliation unresolved for rollout-off suspension', async () => {
    const loggerError = jest.spyOn(Logger, 'error').mockImplementation();
    let currentAppState = 'active';
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => currentAppState,
    });
    const lateOrder = {
      ...activeOrder,
      handle: 'chase-late-unresolved',
      status: 'backgrounded' as const,
    };
    let resolveSuspension: ((orders: (typeof lateOrder)[]) => void) | undefined;
    mockGetChaseOrders
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('reconciliation failed'));
    mockSuspendChaseOrders
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSuspension = resolve;
          }),
      )
      .mockResolvedValueOnce([]);
    let isEnabled = true;
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled }));
    await waitFor(() =>
      expect(hook.result.current.isChaseOrderDiscoveryResolved).toBe(true),
    );
    currentAppState = 'background';

    const suspensionResult = hook.result.current
      .suspendChaseOrders()
      .catch((error) => error);
    await act(async () => Promise.resolve());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.BackgroundSuspensionTimeoutMs,
      );
    });
    await act(async () => resolveSuspension?.([lateOrder]));
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));

    expect(await suspensionResult).toEqual(
      new Error('Chase mutation timed out'),
    );
    expect(hook.result.current.isChaseOrderDiscoveryResolved).toBe(false);

    isEnabled = false;
    act(() => hook.rerender({}));
    await act(async () => hook.result.current.suspendChaseOrders());

    expect(hook.result.current.isChaseOrderDiscoveryResolved).toBe(false);
    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(2);
    hook.unmount();
    loggerError.mockRestore();
  });

  it('defers late reconciliation until controller initialization returns', async () => {
    let currentAppState = 'active';
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => currentAppState,
    });
    const lateOrder = {
      ...activeOrder,
      handle: 'chase-late-uninitialized',
      status: 'backgrounded' as const,
    };
    let resolveSuspension: ((orders: (typeof lateOrder)[]) => void) | undefined;
    mockGetChaseOrders
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([activeOrder]);
    mockSuspendChaseOrders.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSuspension = resolve;
        }),
    );
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.isChaseOrderDiscoveryResolved).toBe(true),
    );
    currentAppState = 'background';

    const suspensionResult = hook.result.current
      .suspendChaseOrders()
      .catch((error) => error);
    await act(async () => Promise.resolve());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.BackgroundSuspensionTimeoutMs,
      );
    });
    mockInitializationState = InitializationState.Uninitialized;
    act(() => hook.rerender({}));
    await act(async () => resolveSuspension?.([lateOrder]));

    expect(await suspensionResult).toEqual(
      new Error('Chase mutation timed out'),
    );
    expect(mockGetChaseOrders).toHaveBeenCalledTimes(1);
    expect(hook.result.current.isChaseOrderDiscoveryResolved).toBe(false);

    currentAppState = 'active';
    mockInitializationState = InitializationState.Initialized;
    act(() => hook.rerender({}));

    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));
    expect(hook.result.current.chaseOrders).toEqual([activeOrder]);
    expect(hook.result.current.isChaseOrderDiscoveryResolved).toBe(true);
    hook.unmount();
  });

  it('rejects late reconciliation that loses initialization while reading', async () => {
    let currentAppState = 'active';
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => currentAppState,
    });
    const lateOrder = {
      ...activeOrder,
      handle: 'chase-late-init-loss',
      status: 'backgrounded' as const,
    };
    let resolveSuspension: ((orders: (typeof lateOrder)[]) => void) | undefined;
    let resolveReconciliation:
      | ((orders: (typeof lateOrder)[]) => void)
      | undefined;
    mockGetChaseOrders
      .mockResolvedValueOnce([])
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveReconciliation = resolve;
          }),
      )
      .mockResolvedValueOnce([activeOrder]);
    mockSuspendChaseOrders.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSuspension = resolve;
        }),
    );
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.isChaseOrderDiscoveryResolved).toBe(true),
    );
    currentAppState = 'background';

    const suspensionResult = hook.result.current
      .suspendChaseOrders()
      .catch((error) => error);
    await act(async () => Promise.resolve());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.BackgroundSuspensionTimeoutMs,
      );
    });
    await act(async () => resolveSuspension?.([lateOrder]));
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));

    mockInitializationState = InitializationState.Uninitialized;
    act(() => hook.rerender({}));
    await act(async () => resolveReconciliation?.([lateOrder]));

    expect(await suspensionResult).toEqual(
      new Error('Chase mutation timed out'),
    );
    expect(mockGetChaseOrders).toHaveBeenCalledTimes(2);
    expect(hook.result.current.chaseOrders).not.toContainEqual(lateOrder);
    expect(hook.result.current.isChaseOrderDiscoveryResolved).toBe(false);

    currentAppState = 'active';
    mockInitializationState = InitializationState.Initialized;
    act(() => hook.rerender({}));

    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(3));
    expect(hook.result.current.chaseOrders).toEqual([activeOrder]);
    expect(hook.result.current.isChaseOrderDiscoveryResolved).toBe(true);
    hook.unmount();
  });

  it('retries retained-session discovery after a transient failure', async () => {
    mockGetChaseOrders
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce([activeOrder]);
    const { result, unmount } = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: false }),
    );
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));

    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.RefreshIntervalMs,
      );
    });

    expect(mockGetChaseOrders).toHaveBeenCalledTimes(2);
    expect(result.current.chaseOrders).toEqual([activeOrder]);
    unmount();
  });

  it('pauses discovery retries in background and resumes on active', async () => {
    let currentAppState = 'active';
    let appStateListener: ((state: string) => void) | undefined;
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => currentAppState,
    });
    const appStateSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        appStateListener = listener as (state: string) => void;
        return { remove: jest.fn() };
      });
    mockGetChaseOrders
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce([]);
    const { unmount } = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: false }),
    );
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));

    currentAppState = 'background';
    act(() => appStateListener?.('background'));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.DiscoveryRetryMaxDelayMs,
      );
    });

    expect(mockGetChaseOrders).toHaveBeenCalledTimes(1);

    currentAppState = 'active';
    act(() => appStateListener?.('active'));

    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));
    unmount();
    appStateSpy.mockRestore();
  });

  it('bounds persistent discovery retries and logs once per failure streak', async () => {
    const loggerError = jest.spyOn(Logger, 'error').mockImplementation();
    mockGetChaseOrders.mockRejectedValue(new Error('persistent failure'));
    const { unmount } = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: false }),
    );
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));

    await exhaustDiscoveryRetries();

    expect(mockGetChaseOrders).toHaveBeenCalledTimes(
      CHASE_ORDER_UI_CONFIG.DiscoveryRetryMaxAttempts,
    );
    expect(loggerError).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    unmount();
    loggerError.mockRestore();
  });

  it('restarts an exhausted discovery streak after invalidation', async () => {
    const loggerError = jest.spyOn(Logger, 'error').mockImplementation();
    mockGetChaseOrders.mockRejectedValue(new Error('persistent failure'));
    const { unmount } = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: false }),
    );
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));
    await exhaustDiscoveryRetries();

    act(() => PerpsCacheInvalidator.invalidate('accountState'));
    await waitFor(() =>
      expect(mockGetChaseOrders).toHaveBeenCalledTimes(
        CHASE_ORDER_UI_CONFIG.DiscoveryRetryMaxAttempts + 1,
      ),
    );

    expect(loggerError).toHaveBeenCalledTimes(2);
    unmount();
    loggerError.mockRestore();
  });

  it('restarts an exhausted discovery streak when rollout becomes enabled', async () => {
    mockGetChaseOrders.mockRejectedValue(new Error('persistent failure'));
    let isEnabled = false;
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled }));
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));
    await exhaustDiscoveryRetries();

    isEnabled = true;
    hook.rerender({});

    await waitFor(() =>
      expect(mockGetChaseOrders).toHaveBeenCalledTimes(
        CHASE_ORDER_UI_CONFIG.DiscoveryRetryMaxAttempts + 1,
      ),
    );
    hook.unmount();
  });

  it('restarts an exhausted discovery streak on foreground', async () => {
    let appStateListener: ((state: string) => void) | undefined;
    const appStateSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        appStateListener = listener as (state: string) => void;
        return { remove: jest.fn() };
      });
    mockGetChaseOrders.mockRejectedValue(new Error('persistent failure'));
    const { unmount } = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: false }),
    );
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));
    await exhaustDiscoveryRetries();

    act(() => appStateListener?.('active'));

    await waitFor(() =>
      expect(mockGetChaseOrders).toHaveBeenCalledTimes(
        CHASE_ORDER_UI_CONFIG.DiscoveryRetryMaxAttempts + 1,
      ),
    );
    unmount();
    appStateSpy.mockRestore();
  });

  it.each([
    'backgrounded',
    'canceled',
    'duration_reached',
    'failed',
    'filled',
    'max_distance_reached',
    'repricing_limit_reached',
  ] as const)(
    'preserves %s history when a provider refresh omits it',
    async (status) => {
      const terminalOrder = { ...activeOrder, status };
      mockGetChaseOrders
        .mockResolvedValueOnce([terminalOrder])
        .mockResolvedValueOnce([]);
      const { result, unmount } = renderHook(() =>
        usePerpsChaseOrders({ isEnabled: true }),
      );
      await waitFor(() =>
        expect(result.current.chaseOrders).toEqual([terminalOrder]),
      );

      await act(async () => result.current.getChaseOrders());

      expect(result.current.chaseOrders).toEqual([terminalOrder]);
      unmount();
    },
  );

  it('retains newest terminal history within the configured count limit', async () => {
    const historyOrders = Array.from(
      { length: CHASE_ORDER_UI_CONFIG.TerminalHistoryLimit + 2 },
      (_, index) => ({
        ...activeOrder,
        handle: `history-${index}`,
        startedAt: index,
        status: 'canceled' as const,
      }),
    );
    mockGetChaseOrders.mockResolvedValueOnce(historyOrders);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: false }));

    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toHaveLength(
        CHASE_ORDER_UI_CONFIG.TerminalHistoryLimit,
      ),
    );

    expect(
      hook.result.current.chaseOrders.map((order) => order.handle),
    ).toEqual(
      historyOrders
        .slice(2)
        .reverse()
        .map((order) => order.handle),
    );
    hook.unmount();
  });

  it('uses controller lifecycle truth across termination refreshes', async () => {
    mockGetChaseOrders
      .mockResolvedValueOnce([activeOrder])
      .mockResolvedValueOnce([
        { ...activeOrder, status: 'termination_pending' },
      ])
      .mockResolvedValueOnce([{ ...activeOrder, status: 'canceled' }]);
    const { result, unmount } = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: true }),
    );
    await waitFor(() =>
      expect(result.current.chaseOrders).toEqual([activeOrder]),
    );

    await act(async () => result.current.getChaseOrders());
    expect(result.current.chaseOrders).toEqual([
      {
        ...activeOrder,
        status: 'termination_pending',
      },
    ]);

    await act(async () => result.current.getChaseOrders());
    expect(result.current.chaseOrders).toEqual([
      {
        ...activeOrder,
        status: 'canceled',
      },
    ]);
    unmount();
  });

  it('retains a route-bound canceled snapshot after authoritative omission', async () => {
    const canceledOrder = {
      ...activeOrder,
      restingOrderId: null,
      status: 'canceled' as const,
    };
    mockGetChaseOrders
      .mockResolvedValueOnce([activeOrder])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
    );

    await act(async () =>
      hook.result.current.reconcileCanceledChaseOrder(activeOrder),
    );

    expect(hook.result.current.chaseOrders).toEqual([canceledOrder]);

    await act(async () => hook.result.current.getChaseOrders());

    expect(hook.result.current.chaseOrders).toEqual([canceledOrder]);
    hook.unmount();
  });

  it('records canceled immediately for an aggregated authoritative omission', async () => {
    mockPerpsProvider = 'aggregated';
    mockGetChaseOrders
      .mockResolvedValueOnce([activeOrder])
      .mockResolvedValueOnce([]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
    );

    await act(async () =>
      hook.result.current.reconcileCanceledChaseOrder(activeOrder),
    );

    expect(hook.result.current.chaseOrders).toEqual([
      {
        ...activeOrder,
        restingOrderId: null,
        status: 'canceled',
      },
    ]);
    hook.unmount();
  });

  it('retains a proven Filled Chase across empty refresh and screen remount', async () => {
    const runtimeActiveOrder: ChaseOrder = {
      ...activeOrder,
      handle: 'chase-4dbd96d9-1b85-4067-8b04-da01423b8e7a',
      symbol: 'SOL',
      originalSize: '0.31',
      remainingSize: '0.31',
      restingOrderId: '59081412404',
      startedAt: 1_788_278_727_454,
      providerId: primaryProvider,
    };
    const filledOrder = {
      ...runtimeActiveOrder,
      remainingSize: '0',
      restingOrderId: null,
      status: 'filled' as const,
    };
    mockGetChaseOrders
      .mockResolvedValueOnce([runtimeActiveOrder])
      .mockResolvedValue([]);
    mockGetOrders.mockResolvedValue([
      makeHistoricalOrder({
        orderId: '59081412404',
        symbol: 'SOL',
        size: '0.31',
        originalSize: '0.31',
        filledSize: '0.31',
        remainingSize: '0',
        timestamp: 1_788_278_742_740,
        lastUpdated: 1_788_278_742_740,
        providerId: primaryProvider,
      }),
    ]);
    const retainedConsumer = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: false, enableDiscovery: true }),
    );
    const screenConsumer = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: true, enableDiscovery: false }),
    );
    await waitFor(() =>
      expect(screenConsumer.result.current.chaseOrders).toEqual([
        runtimeActiveOrder,
      ]),
    );

    await act(async () => screenConsumer.result.current.getChaseOrders());
    expect(screenConsumer.result.current.chaseOrders).toEqual([filledOrder]);
    screenConsumer.unmount();
    const remountedScreenConsumer = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: true, enableDiscovery: false }),
    );
    expect(remountedScreenConsumer.result.current.chaseOrders).toEqual([
      filledOrder,
    ]);
    await act(async () =>
      remountedScreenConsumer.result.current.getChaseOrders(),
    );

    expect(remountedScreenConsumer.result.current.chaseOrders).toEqual([
      filledOrder,
    ]);
    expect(mockGetOrders).toHaveBeenCalledWith(
      { startTime: runtimeActiveOrder.startedAt },
      { forceRefresh: true },
    );
    remountedScreenConsumer.unmount();
    retainedConsumer.unmount();
  });

  it('retains a clean child cancellation as Canceled across refresh and remount', async () => {
    const runtimeActiveOrder: ChaseOrder = {
      ...activeOrder,
      handle: 'chase-3061e839-7bac-4b3b-b3c6-7f60b1135229',
      symbol: 'SOL',
      originalSize: '1.01',
      remainingSize: '1.01',
      restingOrderId: '59106897534',
      startedAt: 1_788_302_458_039,
    };
    const canceledOrder = {
      ...runtimeActiveOrder,
      restingOrderId: null,
      status: 'canceled' as const,
    };
    mockGetChaseOrders
      .mockResolvedValueOnce([runtimeActiveOrder])
      .mockResolvedValue([]);
    mockGetOrders.mockResolvedValue([
      makeHistoricalOrder({
        orderId: '59106897534',
        symbol: 'SOL',
        size: '1.01',
        originalSize: '1.01',
        filledSize: '0',
        remainingSize: '1.01',
        status: 'canceled',
        timestamp: 1_788_302_507_869,
        lastUpdated: 1_788_302_507_869,
      }),
    ]);
    const retainedConsumer = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: false, enableDiscovery: true }),
    );
    const screenConsumer = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: true, enableDiscovery: false }),
    );
    await waitFor(() =>
      expect(screenConsumer.result.current.chaseOrders).toEqual([
        runtimeActiveOrder,
      ]),
    );

    await act(async () => screenConsumer.result.current.getChaseOrders());
    expect(screenConsumer.result.current.chaseOrders).toEqual([canceledOrder]);
    screenConsumer.unmount();
    const remountedScreenConsumer = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: true, enableDiscovery: false }),
    );
    expect(remountedScreenConsumer.result.current.chaseOrders).toEqual([
      canceledOrder,
    ]);
    await act(async () =>
      remountedScreenConsumer.result.current.getChaseOrders(),
    );

    expect(remountedScreenConsumer.result.current.chaseOrders).toEqual([
      canceledOrder,
    ]);
    remountedScreenConsumer.unmount();
    retainedConsumer.unmount();
  });

  it('does not synthesize Canceled from a partially filled child', async () => {
    const partiallyFilledOrder = {
      ...activeOrder,
      originalSize: '1.01',
      remainingSize: '0.89',
    };
    mockGetChaseOrders
      .mockResolvedValueOnce([partiallyFilledOrder])
      .mockResolvedValueOnce([]);
    mockGetOrders.mockResolvedValue([
      makeHistoricalOrder({
        size: '1.01',
        originalSize: '1.01',
        filledSize: '0.12',
        remainingSize: '0.89',
        status: 'canceled',
      }),
    ]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([partiallyFilledOrder]),
    );

    await act(async () => hook.result.current.getChaseOrders());

    expect(hook.result.current.chaseOrders).toEqual([]);
    hook.unmount();
  });

  it('does not synthesize Filled for an unknown omission', async () => {
    mockGetChaseOrders
      .mockResolvedValueOnce([activeOrder])
      .mockResolvedValueOnce([]);
    mockGetOrders.mockResolvedValue([]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
    );

    await act(async () => hook.result.current.getChaseOrders());

    expect(hook.result.current.chaseOrders).toEqual([]);
    hook.unmount();
  });

  it.each([
    {
      name: 'earlier cumulative fills already reflected in the remainder',
      filledSize: '0.7',
      historicalRemainingSize: '0.3',
    },
    {
      name: 'a later fill delta below the cached remainder',
      filledSize: '0.9',
      historicalRemainingSize: '0.1',
    },
  ])('does not infer Filled from $name', async (history) => {
    const reducedRemainderOrder = {
      ...activeOrder,
      originalSize: '1',
      remainingSize: '0.3',
    };
    mockGetChaseOrders
      .mockResolvedValueOnce([reducedRemainderOrder])
      .mockResolvedValueOnce([]);
    mockGetOrders.mockResolvedValue([
      makeHistoricalOrder({
        filledSize: history.filledSize,
        remainingSize: history.historicalRemainingSize,
        status: 'canceled',
      }),
    ]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([reducedRemainderOrder]),
    );

    await act(async () => hook.result.current.getChaseOrders());

    expect(hook.result.current.chaseOrders).toEqual([]);
    hook.unmount();
  });

  it('retains one Filled Chase for duplicate Filled child history', async () => {
    mockGetChaseOrders
      .mockResolvedValueOnce([activeOrder])
      .mockResolvedValueOnce([]);
    mockGetOrders.mockResolvedValue([
      makeHistoricalOrder(),
      makeHistoricalOrder(),
    ]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
    );

    await act(async () => hook.result.current.getChaseOrders());

    expect(hook.result.current.chaseOrders).toEqual([
      {
        ...activeOrder,
        remainingSize: '0',
        restingOrderId: null,
        status: 'filled',
      },
    ]);
    hook.unmount();
  });

  it.each([
    {
      latestStatus: 'filled' as const,
      olderStatus: 'canceled' as const,
      expectedStatus: 'filled' as const,
      expectedRemainingSize: '0',
    },
    {
      latestStatus: 'canceled' as const,
      olderStatus: 'filled' as const,
      expectedStatus: 'canceled' as const,
      expectedRemainingSize: '1',
    },
  ])(
    'uses latest $latestStatus child truth during a Canceled-vs-Filled race',
    async ({
      latestStatus,
      olderStatus,
      expectedStatus,
      expectedRemainingSize,
    }) => {
      mockGetChaseOrders
        .mockResolvedValueOnce([activeOrder])
        .mockResolvedValueOnce([]);
      mockGetOrders.mockResolvedValue([
        makeHistoricalOrder({
          status: olderStatus,
          timestamp: 2,
          lastUpdated: 2,
        }),
        makeHistoricalOrder({
          status: latestStatus,
          timestamp: 3,
          lastUpdated: 3,
        }),
      ]);
      const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
      await waitFor(() =>
        expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
      );

      await act(async () =>
        hook.result.current.reconcileCanceledChaseOrder(activeOrder),
      );

      expect(hook.result.current.chaseOrders).toEqual([
        {
          ...activeOrder,
          remainingSize: expectedRemainingSize,
          restingOrderId: null,
          status: expectedStatus,
        },
      ]);
      hook.unmount();
    },
  );

  it('records Canceled when child history is not Filled', async () => {
    const partiallyFilledOrder = {
      ...activeOrder,
      originalSize: '0.31',
      remainingSize: '0.31',
    };
    mockGetChaseOrders
      .mockResolvedValueOnce([partiallyFilledOrder])
      .mockResolvedValueOnce([]);
    mockGetOrders.mockResolvedValue([
      makeHistoricalOrder({
        filledSize: '0.12',
        remainingSize: '0.19',
        status: 'canceled',
      }),
    ]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([partiallyFilledOrder]),
    );

    await act(async () =>
      hook.result.current.reconcileCanceledChaseOrder(partiallyFilledOrder),
    );

    expect(hook.result.current.chaseOrders).toEqual([
      {
        ...partiallyFilledOrder,
        restingOrderId: null,
        status: 'canceled',
      },
    ]);
    hook.unmount();
  });

  it('ignores old-route fill evidence after the Chase route changes', async () => {
    let resolveOldRouteOrders: ((orders: Order[]) => void) | undefined;
    mockGetChaseOrders
      .mockResolvedValueOnce([activeOrder])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockGetOrders.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOldRouteOrders = resolve;
        }),
    );
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
    );
    const oldRouteRefresh = hook.result.current
      .getChaseOrders()
      .catch((error) => error);
    await waitFor(() => expect(mockGetOrders).toHaveBeenCalledTimes(1));

    mockSelectedAddress = '0xaccount-b';
    hook.rerender({});
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(3));
    await act(async () =>
      resolveOldRouteOrders?.([
        makeHistoricalOrder({
          orderId: activeOrder.restingOrderId ?? 'order-1',
        }),
      ]),
    );

    expect(await oldRouteRefresh).toMatchObject({ code: 'stale_request' });
    expect(hook.result.current.chaseOrders).toEqual([]);
    hook.unmount();
  });

  it('preserves canceled history when invalidation races reconciliation', async () => {
    let resolveCancellationRefresh:
      | ((orders: ChaseOrder[]) => void)
      | undefined;
    mockGetChaseOrders
      .mockResolvedValueOnce([activeOrder])
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCancellationRefresh = resolve;
          }),
      )
      .mockResolvedValueOnce([]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
    );

    const reconciliation =
      hook.result.current.reconcileCanceledChaseOrder(activeOrder);
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));
    act(() => PerpsCacheInvalidator.invalidate('accountState'));
    expect(mockGetChaseOrders).toHaveBeenCalledTimes(2);
    await act(async () => {
      resolveCancellationRefresh?.([]);
      await reconciliation;
    });

    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(3));
    expect(hook.result.current.chaseOrders).toEqual([
      {
        ...activeOrder,
        restingOrderId: null,
        status: 'canceled',
      },
    ]);
    hook.unmount();
  });

  it('keeps a newer suspension authoritative over deferred invalidation', async () => {
    const suspendedOrder = {
      ...activeOrder,
      restingOrderId: null,
      status: 'backgrounded' as const,
    };
    let resolveCancellationRefresh:
      | ((orders: ChaseOrder[]) => void)
      | undefined;
    mockGetChaseOrders
      .mockResolvedValueOnce([activeOrder])
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCancellationRefresh = resolve;
          }),
      );
    mockSuspendChaseOrders.mockResolvedValueOnce([suspendedOrder]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
    );

    const reconciliation = hook.result.current
      .reconcileCanceledChaseOrder(activeOrder)
      .catch((error) => error);
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));
    act(() => PerpsCacheInvalidator.invalidate('accountState'));
    let suspensionResult: ChaseOrder[] = [];
    await act(async () => {
      suspensionResult = await hook.result.current.suspendChaseOrders();
    });
    await act(async () => resolveCancellationRefresh?.([]));

    expect(await reconciliation).toMatchObject({ code: 'stale_request' });
    expect(suspensionResult).toEqual([suspendedOrder]);
    expect(hook.result.current.chaseOrders).toEqual([suspendedOrder]);
    expect(mockGetChaseOrders).toHaveBeenCalledTimes(2);
    hook.unmount();
  });

  it('refreshes a new route while old-route cancellation is pending', async () => {
    const newRouteOrder = {
      ...activeOrder,
      handle: 'chase-new-route',
    };
    const refreshedNewRouteOrder = {
      ...newRouteOrder,
      restingPrice: '102',
    };
    let resolveOldRouteRefresh: ((orders: ChaseOrder[]) => void) | undefined;
    mockGetChaseOrders
      .mockResolvedValueOnce([activeOrder])
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOldRouteRefresh = resolve;
          }),
      )
      .mockResolvedValueOnce([newRouteOrder])
      .mockResolvedValueOnce([refreshedNewRouteOrder]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
    );
    const oldRouteReconciliation = hook.result.current
      .reconcileCanceledChaseOrder(activeOrder)
      .catch((error) => error);
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));

    mockSelectedAddress = '0xaccount-b';
    hook.rerender({});
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([newRouteOrder]),
    );
    act(() => PerpsCacheInvalidator.invalidate('accountState'));

    await waitFor(() => {
      expect(mockGetChaseOrders).toHaveBeenCalledTimes(4);
      expect(hook.result.current.chaseOrders).toEqual([refreshedNewRouteOrder]);
    });
    await act(async () => resolveOldRouteRefresh?.([]));
    expect(await oldRouteReconciliation).toMatchObject({
      code: 'stale_request',
    });
    hook.unmount();
  });

  it('releases route-local invalidation after reconciliation fails', async () => {
    let rejectCancellationRefresh: ((error: Error) => void) | undefined;
    mockGetChaseOrders
      .mockResolvedValueOnce([activeOrder])
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectCancellationRefresh = reject;
          }),
      )
      .mockResolvedValue([activeOrder]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
    );

    const reconciliation = hook.result.current
      .reconcileCanceledChaseOrder(activeOrder)
      .catch((error) => error);
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));
    act(() => PerpsCacheInvalidator.invalidate('accountState'));
    await act(async () =>
      rejectCancellationRefresh?.(new Error('refresh failed')),
    );
    expect(await reconciliation).toEqual(new Error('refresh failed'));
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(3));

    act(() => PerpsCacheInvalidator.invalidate('accountState'));

    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(4));
    expect(hook.result.current.chaseOrders).toEqual([activeOrder]);
    hook.unmount();
  });

  it('keeps a remounted same-route reconciliation guarded after old completion', async () => {
    let resolveOldReconciliation: ((orders: ChaseOrder[]) => void) | undefined;
    let resolveNewReconciliation: ((orders: ChaseOrder[]) => void) | undefined;
    mockGetChaseOrders
      .mockResolvedValueOnce([activeOrder])
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOldReconciliation = resolve;
          }),
      )
      .mockResolvedValueOnce([activeOrder])
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveNewReconciliation = resolve;
          }),
      )
      .mockResolvedValueOnce([]);
    const oldHook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(oldHook.result.current.chaseOrders).toEqual([activeOrder]),
    );
    const oldReconciliation = oldHook.result.current
      .reconcileCanceledChaseOrder(activeOrder)
      .catch((error) => error);
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));

    oldHook.unmount();
    const newHook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(newHook.result.current.chaseOrders).toEqual([activeOrder]),
    );
    const newReconciliation =
      newHook.result.current.reconcileCanceledChaseOrder(activeOrder);
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(4));
    await act(async () => resolveOldReconciliation?.([]));
    expect(await oldReconciliation).toMatchObject({ code: 'stale_request' });
    act(() => PerpsCacheInvalidator.invalidate('accountState'));
    expect(mockGetChaseOrders).toHaveBeenCalledTimes(4);
    await act(async () => {
      resolveNewReconciliation?.([]);
      await newReconciliation;
    });

    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(5));
    expect(newHook.result.current.chaseOrders).toEqual([
      {
        ...activeOrder,
        restingOrderId: null,
        status: 'canceled',
      },
    ]);
    newHook.unmount();
  });

  it('keeps controller terminal truth after cancellation reconciliation', async () => {
    const filledOrder = {
      ...activeOrder,
      remainingSize: '0',
      restingOrderId: null,
      status: 'filled' as const,
    };
    mockGetChaseOrders
      .mockResolvedValueOnce([activeOrder])
      .mockResolvedValueOnce([filledOrder]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
    );

    await act(async () =>
      hook.result.current.reconcileCanceledChaseOrder(activeOrder),
    );

    expect(hook.result.current.chaseOrders).toEqual([filledOrder]);
    hook.unmount();
  });

  it.each([
    {
      routePart: 'account',
      changeRoute: () => {
        mockSelectedAddress = '0xaccount-b';
      },
    },
    {
      routePart: 'provider',
      changeRoute: () => {
        mockPerpsProvider = 'aggregated';
      },
    },
    {
      routePart: 'network',
      changeRoute: () => {
        mockPerpsNetwork = 'testnet';
      },
    },
  ])(
    'hides canceled history after the Chase $routePart route changes',
    async ({ changeRoute }) => {
      mockGetChaseOrders
        .mockResolvedValueOnce([activeOrder])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
      await waitFor(() =>
        expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
      );
      await act(async () =>
        hook.result.current.reconcileCanceledChaseOrder(activeOrder),
      );
      const reconcileForOldRoute =
        hook.result.current.reconcileCanceledChaseOrder;
      expect(hook.result.current.chaseOrders[0]?.status).toBe('canceled');

      changeRoute();
      hook.rerender({});
      let routeError: unknown;
      await act(async () => {
        try {
          await reconcileForOldRoute(activeOrder);
        } catch (error) {
          routeError = error;
        }
      });

      expect(routeError).toMatchObject({ code: 'stale_request' });
      expect(hook.result.current.chaseOrders).toEqual([]);
      await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(3));
      hook.unmount();
    },
  );

  it('preserves the last snapshot when a same-account refresh fails', async () => {
    mockGetChaseOrders.mockResolvedValueOnce([activeOrder]);
    const { result, unmount } = renderHook(() =>
      usePerpsChaseOrders({ isEnabled: true }),
    );
    await waitFor(() =>
      expect(result.current.chaseOrders).toEqual([activeOrder]),
    );
    mockGetChaseOrders.mockRejectedValueOnce(new Error('temporary failure'));

    await act(async () => {
      PerpsCacheInvalidator.invalidate('accountState');
      await Promise.resolve();
    });

    expect(result.current.chaseOrders).toEqual([activeOrder]);
    unmount();
  });

  it('ignores an old-account refresh that settles after route change', async () => {
    let resolveOld: ((orders: (typeof activeOrder)[]) => void) | undefined;
    mockGetChaseOrders.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));

    mockSelectedAddress = '0xaccount-b';
    hook.rerender({});
    await act(async () => resolveOld?.([activeOrder]));

    expect(hook.result.current.chaseOrders).toEqual([]);
    hook.unmount();
  });

  it('preserves same-route history while connection identity reconnects', async () => {
    const backgroundedOrder = {
      ...activeOrder,
      status: 'backgrounded' as const,
    };
    mockGetChaseOrders
      .mockResolvedValueOnce([backgroundedOrder])
      .mockResolvedValueOnce([]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: false }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([backgroundedOrder]),
    );

    mockConnectionIdentityReady = false;
    act(() =>
      mockConnectionIdentityListeners.forEach((listener) => listener()),
    );

    expect(hook.result.current.chaseOrders).toEqual([backgroundedOrder]);
    expect(hook.result.current.isChaseOrderDiscoveryResolved).toBe(false);

    mockConnectionIdentityReady = true;
    act(() =>
      mockConnectionIdentityListeners.forEach((listener) => listener()),
    );
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));

    expect(hook.result.current.chaseOrders).toEqual([backgroundedOrder]);
    expect(hook.result.current.isChaseOrderDiscoveryResolved).toBe(true);
    hook.unmount();
  });

  it('hides the previous account snapshot immediately when account changes', async () => {
    mockGetChaseOrders.mockResolvedValueOnce([activeOrder]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
    );

    mockSelectedAddress = '0xaccount-b';
    hook.rerender({});

    expect(hook.result.current.chaseOrders).toEqual([]);
    hook.unmount();
  });

  it('waits for the selected account connection before caching its Chase sessions', async () => {
    const accountBOrder = {
      ...activeOrder,
      handle: 'chase-account-b',
      symbol: 'BTC',
    };
    let resolveAccountA: ((orders: (typeof activeOrder)[]) => void) | undefined;
    mockGetChaseOrders
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveAccountA = resolve;
          }),
      )
      .mockResolvedValueOnce([accountBOrder]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));

    mockSelectedAddress = '0xaccount-b';
    mockConnectionIdentityReady = false;
    act(() =>
      mockConnectionIdentityListeners.forEach((listener) => listener()),
    );
    hook.rerender({});
    await act(async () => resolveAccountA?.([activeOrder]));

    expect(hook.result.current.chaseOrders).toEqual([]);
    expect(mockGetChaseOrders).toHaveBeenCalledTimes(1);

    mockConnectionIdentityReady = true;
    act(() =>
      mockConnectionIdentityListeners.forEach((listener) => listener()),
    );
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([accountBOrder]),
    );

    expect(hook.result.current.chaseOrders).not.toContainEqual(activeOrder);
    hook.unmount();
  });

  it('rejects preflight reads before refresh while context reconnects', async () => {
    mockGetChaseOrders
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([activeOrder]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));

    mockSelectedAddress = '0xaccount-b';
    mockPerpsProvider = 'aggregated';
    mockConnectionIdentityReady = false;
    act(() =>
      mockConnectionIdentityListeners.forEach((listener) => listener()),
    );
    hook.rerender({});

    let requestError: unknown;
    await act(async () => {
      try {
        await hook.result.current.getChaseOrders();
      } catch (error) {
        requestError = error;
      }
    });
    expect(requestError).toBeInstanceOf(ChaseOrderRequestError);
    expect(requestError).toMatchObject({ code: 'context_not_ready' });
    expect(mockGetChaseOrders).toHaveBeenCalledTimes(1);

    mockConnectionIdentityReady = true;
    act(() => {
      mockConnectionIdentityListeners.forEach((listener) => listener());
    });
    await waitFor(() =>
      expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
    );

    expect(mockGetChaseOrders).toHaveBeenCalledTimes(2);
    hook.unmount();
  });

  it('rejects a refresh result as stale after the account route changes', async () => {
    let resolveRead: ((orders: (typeof activeOrder)[]) => void) | undefined;
    mockGetChaseOrders
      .mockResolvedValueOnce([])
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRead = resolve;
          }),
      )
      .mockResolvedValueOnce([]);
    const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: true }));
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(1));
    const readPromise = hook.result.current.getChaseOrders();
    const staleReadResult = readPromise.catch((error) => error);
    await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));

    mockSelectedAddress = '0xaccount-b';
    hook.rerender({});
    await act(async () => resolveRead?.([activeOrder]));

    const staleError = await staleReadResult;
    expect(staleError).toBeInstanceOf(ChaseOrderRequestError);
    expect(staleError).toMatchObject({ code: 'stale_request' });
    expect(hook.result.current.chaseOrders).toEqual([]);
    hook.unmount();
  });

  it.each([
    {
      routePart: 'provider',
      changeRoute: () => {
        mockPerpsProvider = 'aggregated';
      },
    },
    {
      routePart: 'network',
      changeRoute: () => {
        mockPerpsNetwork = 'testnet';
      },
    },
  ])(
    'hides the previous snapshot when the $routePart changes',
    async ({ changeRoute }) => {
      mockGetChaseOrders
        .mockResolvedValueOnce([activeOrder])
        .mockResolvedValueOnce([]);
      const hook = renderHook(() => usePerpsChaseOrders({ isEnabled: false }));
      await waitFor(() =>
        expect(hook.result.current.chaseOrders).toEqual([activeOrder]),
      );

      changeRoute();
      hook.rerender({});

      expect(hook.result.current.chaseOrders).toEqual([]);
      await waitFor(() => expect(mockGetChaseOrders).toHaveBeenCalledTimes(2));
      hook.unmount();
    },
  );
});
