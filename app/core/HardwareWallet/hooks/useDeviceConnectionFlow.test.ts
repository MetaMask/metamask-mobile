import { renderHook, act } from '@testing-library/react-native';
import { HardwareWalletType, ConnectionStatus } from '@metamask/hw-wallet-sdk';
import { useDeviceConnectionFlow } from './useDeviceConnectionFlow';
import {
  HardwareWalletRefs,
  HardwareWalletStateSetters,
} from './useHardwareWalletStateManager';

jest.mock('../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

const createMockAdapter = (overrides = {}) => ({
  walletType: HardwareWalletType.Ledger,
  requiresDeviceDiscovery: true,
  resetFlowState: jest.fn(),
  isTransportAvailable: jest.fn().mockResolvedValue(true),
  startDeviceDiscovery: jest.fn(),
  stopDeviceDiscovery: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  getConnectedDeviceId: jest.fn().mockReturnValue('device-123'),
  ensureDeviceReady: jest.fn().mockResolvedValue(true),
  isConnected: jest.fn().mockReturnValue(true),
  backgroundReconnect: jest.fn().mockResolvedValue(false),
  getTransportDisabledErrorCode: jest.fn().mockReturnValue(null),
  markFlowComplete: jest.fn(),
  ensurePermissions: jest.fn().mockResolvedValue(true),
  reset: jest.fn(),
  isFlowComplete: jest.fn().mockReturnValue(false),
  onTransportStateChange: jest.fn(() => jest.fn()),
  destroy: jest.fn(),
  ...overrides,
});

const createMockRefs = (): HardwareWalletRefs => ({
  adapterRef: { current: null },
  isConnectingRef: { current: false },
  abortControllerRef: { current: null },
  targetWalletTypeRef: { current: null },
  pendingOperationWalletTypeRef: { current: null },
});

const createMockSetters = (): HardwareWalletStateSetters => ({
  setConnectionState: jest.fn(),
  setDeviceId: jest.fn(),
  setTargetWalletType: jest.fn(),
  setPendingOperationWalletType: jest.fn(),
});

const createDefaultOptions = (overrides = {}) => ({
  refs: createMockRefs(),
  setters: createMockSetters(),
  walletType: HardwareWalletType.Ledger as HardwareWalletType | null,
  deviceId: null as string | null,
  handleError: jest.fn(),
  updateConnectionState: jest.fn(),
  createAdapterWithCallbacks: jest.fn(),
  initializeAdapter: jest.fn(),
  checkTransportEnabledOrShowError: jest.fn().mockResolvedValue(false),
  ...overrides,
});

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

interface CapturePendingReadinessOptions {
  /**
   * When true (default), awaits one microtask inside `act` after starting
   * readiness (matches the majority of tests here).
   */
  flushMicrotaskInAct?: boolean;
}

/**
 * Runs `start` inside `act`. Returns the readiness promise without `let` +
 * definite assignment workarounds: TypeScript cannot prove a `let` is assigned
 * inside an `async` callback passed to `act`.
 */
async function capturePendingReadiness(
  start: () => Promise<boolean>,
  { flushMicrotaskInAct = true }: CapturePendingReadinessOptions = {},
): Promise<{ readyPromise: Promise<boolean> }> {
  let pending: Promise<boolean> | undefined;
  await act(async () => {
    pending = start();
    if (flushMicrotaskInAct) {
      await Promise.resolve();
    }
  });
  if (pending === undefined) {
    throw new Error('Expected ensureDeviceReady to return a promise');
  }
  return { readyPromise: pending };
}

describe('useDeviceConnectionFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureDeviceReady', () => {
    it('throws when no wallet type is available', async () => {
      const options = createDefaultOptions({ walletType: null });
      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      await expect(
        act(() => result.current.ensureDeviceReady()),
      ).rejects.toThrow('ensureDeviceReady called without a wallet type');
    });

    it('uses targetWalletTypeRef when walletType is null', async () => {
      const refs = createMockRefs();
      refs.targetWalletTypeRef.current = HardwareWalletType.Ledger;
      const mockAdapter = createMockAdapter();
      const createAdapterWithCallbacks = jest.fn().mockReturnValue(mockAdapter);
      const options = createDefaultOptions({
        refs,
        walletType: null,
        deviceId: 'device-123',
        createAdapterWithCallbacks,
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady('device-123'),
      );

      expect(createAdapterWithCallbacks).toHaveBeenCalledWith(
        HardwareWalletType.Ledger,
      );

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
    });

    it('uses pendingOperationWalletTypeRef before the render catches up', async () => {
      const refs = createMockRefs();
      refs.pendingOperationWalletTypeRef.current = HardwareWalletType.Qr;
      const mockAdapter = createMockAdapter({
        walletType: HardwareWalletType.Qr,
        requiresDeviceDiscovery: false,
      });
      const createAdapterWithCallbacks = jest.fn().mockReturnValue(mockAdapter);
      const options = createDefaultOptions({
        refs,
        walletType: HardwareWalletType.Ledger,
        createAdapterWithCallbacks,
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      await expect(result.current.ensureDeviceReady()).resolves.toBe(true);

      expect(createAdapterWithCallbacks).toHaveBeenCalledWith(
        HardwareWalletType.Qr,
      );
      expect(mockAdapter.ensureDeviceReady).toHaveBeenCalledWith('default');
    });

    it('calls onFlowStart callback', async () => {
      const mockAdapter = createMockAdapter();
      const onFlowStart = jest.fn();
      const options = createDefaultOptions({
        onFlowStart,
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
        checkTransportEnabledOrShowError: jest.fn().mockResolvedValue(true),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady('device-123'),
      );

      expect(onFlowStart).toHaveBeenCalled();

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
    });

    it('cancels previous pending readiness check when a new flow starts', async () => {
      const mockAdapter = createMockAdapter();
      const options = createDefaultOptions({
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
        checkTransportEnabledOrShowError: jest.fn().mockResolvedValue(true),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      // Start first flow
      const { readyPromise: firstPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady(),
      );

      // Start second flow (cancels first)
      const { readyPromise: secondPromise } = await capturePendingReadiness(
        () => result.current.ensureDeviceReady(),
      );

      await expect(firstPromise).resolves.toBe(false);

      await act(async () => {
        result.current.closeFlow();
        await expect(secondPromise).resolves.toBe(false);
      });
    });

    it('settles the first blocking promise with false when a second flow overwrites it mid-flight', async () => {
      const mockAdapter = createMockAdapter({
        ensureDeviceReady: jest.fn().mockResolvedValue(false),
      });
      const refs = createMockRefs();
      refs.adapterRef.current = mockAdapter;
      const releaseTransportChecks: ((value: boolean) => void)[] = [];
      const parkedTransportCheck = jest.fn().mockImplementation(
        () =>
          new Promise<boolean>((resolve) => {
            releaseTransportChecks.push(resolve);
          }),
      );
      const options = createDefaultOptions({
        refs,
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
        checkTransportEnabledOrShowError: parkedTransportCheck,
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      // Start flow 1 and park it at the async transport check — before any
      // blocking-promise resolver has been registered.
      let firstPromise!: Promise<boolean>;
      await act(async () => {
        firstPromise = result.current.ensureDeviceReady('device-123');
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(parkedTransportCheck).toHaveBeenCalledTimes(1);

      // Start flow 2 while flow 1 is parked. The entry-time cancellation in
      // ensureDeviceReady sees no pending resolver (flow 1 has not registered
      // one yet), so flow 2 proceeds to the same parked transport check.
      let secondPromise!: Promise<boolean>;
      await act(async () => {
        secondPromise = result.current.ensureDeviceReady('device-123');
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(parkedTransportCheck).toHaveBeenCalledTimes(2);

      // Release both flows (in start order): flow 1 registers its resolver,
      // then flow 2 overwrites it — flow 1's awaiter must be settled with
      // false instead of being orphaned forever.
      await act(async () => {
        releaseTransportChecks[0](false);
        releaseTransportChecks[1](false);
        await expect(firstPromise).resolves.toBe(false);
      });

      await act(async () => {
        result.current.closeFlow();
        await expect(secondPromise).resolves.toBe(false);
      });
    });

    it('surfaces an error when auto-path readiness returns false with a pending flow and no guided state', async () => {
      const mockAdapter = createMockAdapter({
        isConnected: jest.fn().mockReturnValue(false),
        ensureDeviceReady: jest.fn().mockResolvedValue(false),
      });
      const refs = createMockRefs();
      refs.adapterRef.current = mockAdapter;
      const options = createDefaultOptions({
        refs,
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      // Start the flow: not connected, so it falls to the auto path inside
      // createBlockingPromise's afterSetup (device ID present).
      const { readyPromise } = await capturePendingReadiness(
        () => result.current.ensureDeviceReady('device-123'),
        { flushMicrotaskInAct: false },
      );
      await flushPromises();

      expect(options.handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Device did not become ready after connecting',
        }),
      );

      // handleError does not settle the consumer's promise; closeFlow does.
      await act(async () => {
        result.current.closeFlow();
        await expect(readyPromise).resolves.toBe(false);
      });
    });

    it('resolves the pending promise when the auto path reconnects and verifies successfully', async () => {
      const mockAdapter = createMockAdapter({
        isConnected: jest.fn().mockReturnValue(false),
        ensureDeviceReady: jest.fn().mockResolvedValue(true),
      });
      const refs = createMockRefs();
      refs.adapterRef.current = mockAdapter;
      const options = createDefaultOptions({
        refs,
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(
        () => result.current.ensureDeviceReady('device-123'),
        { flushMicrotaskInAct: false },
      );

      const resolved = await readyPromise;
      expect(resolved).toBe(true);
      expect(options.updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Ready,
        deviceId: 'device-123',
      });
      expect(options.handleError).not.toHaveBeenCalled();
    });

    it('routes adapter readiness throws from the auto path to handleError and stays settle-capable', async () => {
      const mockAdapter = createMockAdapter({
        isConnected: jest.fn().mockReturnValue(false),
        ensureDeviceReady: jest
          .fn()
          .mockRejectedValue(new Error('auto path failure')),
      });
      const refs = createMockRefs();
      refs.adapterRef.current = mockAdapter;
      const options = createDefaultOptions({
        refs,
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(
        () => result.current.ensureDeviceReady('device-123'),
        { flushMicrotaskInAct: false },
      );
      await flushPromises();

      expect(options.handleError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'auto path failure' }),
      );

      await act(async () => {
        result.current.closeFlow();
        await expect(readyPromise).resolves.toBe(false);
      });
    });

    it('does not double-handle when a newer flow already cancelled the pending promise', async () => {
      let resolveAdapterReadiness!: (value: boolean) => void;
      let adapterCallCount = 0;
      const mockAdapter = createMockAdapter({
        isConnected: jest.fn().mockReturnValue(false),
        ensureDeviceReady: jest.fn().mockImplementation(() => {
          adapterCallCount += 1;
          if (adapterCallCount === 1) {
            return new Promise<boolean>((resolve) => {
              resolveAdapterReadiness = resolve;
            });
          }
          return Promise.resolve(false);
        }),
      });
      const refs = createMockRefs();
      refs.adapterRef.current = mockAdapter;
      let releaseSecondTransportCheck!: (value: boolean) => void;
      let transportCheckCalls = 0;
      const options = createDefaultOptions({
        refs,
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
        checkTransportEnabledOrShowError: jest.fn().mockImplementation(() => {
          transportCheckCalls += 1;
          if (transportCheckCalls === 1) {
            return Promise.resolve(false);
          }
          return new Promise<boolean>((resolve) => {
            releaseSecondTransportCheck = resolve;
          });
        }),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      // Flow 1: drain microtasks (bounded) until its readiness check is
      // parked on the deferred adapter promise.
      const { readyPromise: firstPromise } = await capturePendingReadiness(
        () => result.current.ensureDeviceReady('device-123'),
        { flushMicrotaskInAct: false },
      );
      let flow1Parked = false;
      await act(async () => {
        for (let i = 0; i < 200 && !flow1Parked; i++) {
          await Promise.resolve();
          flow1Parked = Boolean(resolveAdapterReadiness);
        }
      });
      if (!flow1Parked) {
        throw new Error('flow 1 never reached the adapter readiness check');
      }

      // Flow 2 cancels flow 1's pending promise, then parks at its own
      // transport check before registering a new resolver.
      let secondPromise!: Promise<boolean>;
      let flow2Parked = false;
      await act(async () => {
        secondPromise = result.current.ensureDeviceReady('device-456');
        for (let i = 0; i < 200 && !flow2Parked; i++) {
          await Promise.resolve();
          flow2Parked = transportCheckCalls >= 2;
        }
      });
      if (!flow2Parked) {
        throw new Error('flow 2 never reached its transport check');
      }

      // Flow 1's readiness lands false while the pending promise is already
      // cancelled and not yet re-registered — handleError must not fire.
      await act(async () => {
        resolveAdapterReadiness(false);
        for (let i = 0; i < 200; i++) {
          await Promise.resolve();
        }
      });
      expect(options.handleError).not.toHaveBeenCalled();

      await act(async () => {
        releaseSecondTransportCheck(true);
        // Drain so flow 2's continuation re-registers its resolver BEFORE
        // closeFlow runs — otherwise closeFlow finds no pending resolver and
        // flow 2's promise would never settle.
        await Promise.resolve();
        await Promise.resolve();
        result.current.closeFlow();
        await expect(firstPromise).resolves.toBe(false);
        await expect(secondPromise).resolves.toBe(false);
      });
    });

    it('sets deviceId to null when no targetDeviceId provided', async () => {
      const mockAdapter = createMockAdapter();
      const options = createDefaultOptions({
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady(),
      );

      expect(options.setters.setDeviceId).toHaveBeenCalledWith(null);

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
    });

    it('reuses existing adapter when wallet type matches', async () => {
      const mockAdapter = createMockAdapter();
      const refs = createMockRefs();
      refs.adapterRef.current = mockAdapter;
      const createAdapterWithCallbacks = jest.fn();
      const options = createDefaultOptions({
        refs,
        createAdapterWithCallbacks,
        checkTransportEnabledOrShowError: jest.fn().mockResolvedValue(true),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady(),
      );

      expect(createAdapterWithCallbacks).not.toHaveBeenCalled();

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
    });

    it('creates new adapter and disconnects old when wallet type differs', async () => {
      const oldAdapter = createMockAdapter({
        walletType: HardwareWalletType.Ledger,
      });
      const refs = createMockRefs();
      refs.adapterRef.current = oldAdapter;
      const newAdapter = createMockAdapter({
        walletType: HardwareWalletType.Qr,
      });
      const createAdapterWithCallbacks = jest.fn().mockReturnValue(newAdapter);
      const options = createDefaultOptions({
        refs,
        walletType: HardwareWalletType.Qr,
        createAdapterWithCallbacks,
        checkTransportEnabledOrShowError: jest.fn().mockResolvedValue(true),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady(),
      );

      expect(oldAdapter.disconnect).toHaveBeenCalled();
      expect(createAdapterWithCallbacks).toHaveBeenCalledWith(
        HardwareWalletType.Qr,
      );

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
    });

    it('calls resetFlowState on adapter', async () => {
      const mockAdapter = createMockAdapter();
      const options = createDefaultOptions({
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
        checkTransportEnabledOrShowError: jest.fn().mockResolvedValue(true),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady(),
      );

      expect(mockAdapter.resetFlowState).toHaveBeenCalled();

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
    });

    it('returns blocking promise when transport is unavailable', async () => {
      const mockAdapter = createMockAdapter();
      const options = createDefaultOptions({
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
        checkTransportEnabledOrShowError: jest.fn().mockResolvedValue(true),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady(),
      );

      // closeFlow resolves the pending promise with false
      await act(async () => {
        result.current.closeFlow();
        const resolved = await readyPromise;
        expect(resolved).toBe(false);
      });
    });

    it('enters scanning mode when no device ID and discovery required', async () => {
      const mockAdapter = createMockAdapter({
        requiresDeviceDiscovery: true,
        ensureDeviceReady: jest.fn().mockResolvedValue(false),
      });
      const options = createDefaultOptions({
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady(),
      );

      expect(options.updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Scanning,
      });

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
    });

    it('enters connecting mode when device ID provided', async () => {
      const mockAdapter = createMockAdapter({
        ensureDeviceReady: jest.fn().mockResolvedValue(false),
      });
      const options = createDefaultOptions({
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady('device-123'),
      );

      expect(options.updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Connecting,
      });

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
    });

    it('handles QR flow without device discovery', async () => {
      const mockAdapter = createMockAdapter({
        walletType: HardwareWalletType.Qr,
        requiresDeviceDiscovery: false,
        ensureDeviceReady: jest.fn().mockResolvedValue(true),
      });
      const options = createDefaultOptions({
        walletType: HardwareWalletType.Qr,
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(
        () => result.current.ensureDeviceReady(),
        { flushMicrotaskInAct: false },
      );

      expect(options.updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Connecting,
      });

      // QR path resolves the pending promise directly on success
      const resolved = await readyPromise;
      expect(resolved).toBe(true);
    });

    it('handles error in QR no-discovery path', async () => {
      const mockAdapter = createMockAdapter({
        walletType: HardwareWalletType.Qr,
        requiresDeviceDiscovery: false,
        ensureDeviceReady: jest.fn().mockRejectedValue(new Error('QR error')),
      });
      const options = createDefaultOptions({
        walletType: HardwareWalletType.Qr,
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(
        () => result.current.ensureDeviceReady(),
        { flushMicrotaskInAct: false },
      );

      await flushPromises();

      expect(options.handleError).toHaveBeenCalledWith(expect.any(Error));

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
    });

    it('handles error in device ID path', async () => {
      const mockAdapter = createMockAdapter({
        ensureDeviceReady: jest
          .fn()
          .mockRejectedValue(new Error('ready check failed')),
      });
      const options = createDefaultOptions({
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(
        () => result.current.ensureDeviceReady('device-123'),
        { flushMicrotaskInAct: false },
      );

      await flushPromises();

      expect(options.handleError).toHaveBeenCalledWith(expect.any(Error));

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
    });

    it('does not pre-check transport when entering scan mode without deviceId', async () => {
      const mockAdapter = {
        walletType: HardwareWalletType.Ledger,
        requiresDeviceDiscovery: true,
        resetFlowState: jest.fn(),
        isTransportAvailable: jest.fn().mockResolvedValue(true),
        startDeviceDiscovery: jest.fn(),
        stopDeviceDiscovery: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn(),
        getConnectedDeviceId: jest.fn().mockReturnValue(null),
      };
      const checkTransportEnabledOrShowError = jest.fn();
      const options = createDefaultOptions({
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
        checkTransportEnabledOrShowError,
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(
        () => result.current.ensureDeviceReady(),
        { flushMicrotaskInAct: false },
      );

      expect(checkTransportEnabledOrShowError).not.toHaveBeenCalled();
      expect(options.updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Scanning,
      });

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
    });
  });

  describe('tryEnsureReady via ensureDeviceReady', () => {
    it('updates connection state to Ready for non-QR device', async () => {
      const mockAdapter = createMockAdapter({
        walletType: HardwareWalletType.Ledger,
        ensureDeviceReady: jest.fn().mockResolvedValue(true),
      });
      const options = createDefaultOptions({
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(
        () => result.current.ensureDeviceReady('device-123'),
        { flushMicrotaskInAct: false },
      );

      await flushPromises();

      expect(options.updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Ready,
        deviceId: 'device-123',
      });
      expect(mockAdapter.markFlowComplete).toHaveBeenCalled();

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
    });

    it('sets Ready on already-connected fast path (not Connected)', async () => {
      const mockAdapter = createMockAdapter({
        walletType: HardwareWalletType.Ledger,
        isConnected: jest.fn().mockReturnValue(true),
        getConnectedDeviceId: jest.fn().mockReturnValue('device-123'),
        ensureDeviceReady: jest.fn().mockResolvedValue(true),
      });
      const options = createDefaultOptions({
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      await act(async () => {
        await expect(
          result.current.ensureDeviceReady('device-123'),
        ).resolves.toBe(true);
      });

      expect(options.updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Ready,
        deviceId: 'device-123',
      });
      expect(mockAdapter.markFlowComplete).toHaveBeenCalled();
      // Must not fall through to the scanning/connecting blocking UI.
      expect(options.updateConnectionState).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: ConnectionStatus.Scanning }),
      );
      expect(options.updateConnectionState).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: ConnectionStatus.Connecting }),
      );
    });

    it('sets Ready after background reconnect succeeds', async () => {
      const mockAdapter = createMockAdapter({
        walletType: HardwareWalletType.Ledger,
        isConnected: jest.fn().mockReturnValue(false),
        getConnectedDeviceId: jest.fn().mockReturnValue(null),
        backgroundReconnect: jest.fn().mockResolvedValue(true),
        ensureDeviceReady: jest.fn().mockResolvedValue(true),
      });
      const options = createDefaultOptions({
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      await act(async () => {
        await expect(
          result.current.ensureDeviceReady('device-123'),
        ).resolves.toBe(true);
      });

      expect(mockAdapter.backgroundReconnect).toHaveBeenCalledWith(
        'device-123',
      );
      expect(options.updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Ready,
        deviceId: 'device-123',
      });
      expect(mockAdapter.markFlowComplete).toHaveBeenCalled();
    });

    it('falls through to guided flow when already connected but not ready', async () => {
      const mockAdapter = createMockAdapter({
        walletType: HardwareWalletType.Ledger,
        isConnected: jest.fn().mockReturnValue(true),
        getConnectedDeviceId: jest.fn().mockReturnValue('device-123'),
        ensureDeviceReady: jest.fn().mockResolvedValue(false),
      });
      const options = createDefaultOptions({
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
        checkTransportEnabledOrShowError: jest.fn().mockResolvedValue(false),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(
        () => result.current.ensureDeviceReady('device-123'),
        { flushMicrotaskInAct: false },
      );

      await flushPromises();

      // The fast path falls through to the guided flow (Connecting entered,
      // Ready never emitted). The auto path surfaces the bare not-ready as an
      // error so the consumer is never stranded without guided UI.
      expect(options.handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Device did not become ready after connecting',
        }),
      );
      expect(options.updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Connecting,
      });

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
    });

    it('resolves pending for QR device when ready', async () => {
      const mockAdapter = createMockAdapter({
        walletType: HardwareWalletType.Qr,
        requiresDeviceDiscovery: false,
        ensureDeviceReady: jest.fn().mockResolvedValue(true),
      });
      const options = createDefaultOptions({
        walletType: HardwareWalletType.Qr,
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(
        () => result.current.ensureDeviceReady(),
        { flushMicrotaskInAct: false },
      );

      const resolved = await readyPromise;
      expect(resolved).toBe(true);
      expect(mockAdapter.markFlowComplete).toHaveBeenCalled();
    });

    it('does not update state to Ready when device is not ready', async () => {
      const mockAdapter = createMockAdapter({
        ensureDeviceReady: jest.fn().mockResolvedValue(false),
      });
      const options = createDefaultOptions({
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(
        () => result.current.ensureDeviceReady('device-123'),
        { flushMicrotaskInAct: false },
      );

      await flushPromises();

      const calls = (options.updateConnectionState as jest.Mock).mock.calls;
      const readyCalls = calls.filter(
        (c: [Record<string, unknown>]) =>
          c[0]?.status === ConnectionStatus.Ready,
      );
      expect(readyCalls).toHaveLength(0);

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
    });
  });

  describe('connect', () => {
    it('returns early when already connecting', async () => {
      const refs = createMockRefs();
      refs.isConnectingRef.current = true;
      const options = createDefaultOptions({ refs });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      await act(async () => {
        await result.current.connect('device-123');
      });

      expect(options.updateConnectionState).not.toHaveBeenCalled();
    });

    it('throws when no adapter available', async () => {
      const refs = createMockRefs();
      refs.adapterRef.current = null;
      const options = createDefaultOptions({ refs });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      await act(async () => {
        await result.current.connect('device-123');
      });

      expect(options.handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No adapter available',
        }),
      );
    });

    it('connects and runs readiness check', async () => {
      // Report "not ready" so the pending promise stays pending; connect()
      // then surfaces the error to the consumer instead of stranding it.
      const mockAdapter = createMockAdapter({
        ensureDeviceReady: jest.fn().mockResolvedValue(false),
      });
      const refs = createMockRefs();
      refs.adapterRef.current = mockAdapter;
      const options = createDefaultOptions({ refs });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      // Set up a pending resolve via ensureDeviceReady so connect continues
      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady('device-123'),
      );

      await act(async () => {
        await result.current.connect('device-123');
      });

      expect(mockAdapter.connect).toHaveBeenCalledWith('device-123');
      expect(options.setters.setDeviceId).toHaveBeenCalledWith('device-123');
      expect(options.handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Device did not become ready after connecting',
        }),
      );

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
    });

    it('surfaces an error when connect completes but the device is not ready', async () => {
      const mockAdapter = createMockAdapter({
        ensureDeviceReady: jest.fn().mockResolvedValue(false),
      });
      const refs = createMockRefs();
      refs.adapterRef.current = mockAdapter;
      const options = createDefaultOptions({ refs });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      // Register a pending blocking promise so connect() proceeds past its
      // cancellation guard.
      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady('device-123'),
      );

      await act(async () => {
        await result.current.connect('device-123');
      });

      expect(options.handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Device did not become ready after connecting',
        }),
      );

      // handleError does not settle the consumer's promise; closeFlow does.
      await act(async () => {
        result.current.closeFlow();
        await expect(readyPromise).resolves.toBe(false);
      });
    });

    it('returns early when flow cancelled after connect', async () => {
      const mockAdapter = createMockAdapter();
      const refs = createMockRefs();
      refs.adapterRef.current = mockAdapter;
      const options = createDefaultOptions({ refs });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      // Close flow first so pendingReadyResolveRef is null
      act(() => {
        result.current.closeFlow();
      });

      await act(async () => {
        await result.current.connect('device-123');
      });

      expect(options.setters.setDeviceId).not.toHaveBeenCalled();
    });

    it('handles connect error and resets isConnecting', async () => {
      const mockAdapter = createMockAdapter({
        connect: jest.fn().mockRejectedValue(new Error('connect failed')),
      });
      const refs = createMockRefs();
      refs.adapterRef.current = mockAdapter;
      const options = createDefaultOptions({ refs });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady('device-123'),
      );

      await act(async () => {
        await result.current.connect('device-123');
      });

      expect(options.handleError).toHaveBeenCalledWith(expect.any(Error));
      expect(refs.isConnectingRef.current).toBe(false);

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
    });

    it('handles readiness check error after connect', async () => {
      const mockAdapter = createMockAdapter({
        ensureDeviceReady: jest
          .fn()
          .mockRejectedValue(new Error('readiness failed')),
      });
      const refs = createMockRefs();
      refs.adapterRef.current = mockAdapter;
      const options = createDefaultOptions({ refs });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady('device-123'),
      );

      await act(async () => {
        await result.current.connect('device-123');
      });

      expect(options.handleError).toHaveBeenCalledWith(expect.any(Error));

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
    });
  });

  describe('retryEnsureDeviceReady', () => {
    it('resets flow state when adapter exists', async () => {
      const mockAdapter = createMockAdapter();
      const refs = createMockRefs();
      refs.adapterRef.current = mockAdapter;
      const options = createDefaultOptions({ refs, deviceId: 'device-123' });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      await act(async () => {
        await result.current.retryEnsureDeviceReady();
      });

      expect(mockAdapter.resetFlowState).toHaveBeenCalled();
    });

    it('returns early when permissions denied', async () => {
      const mockAdapter = createMockAdapter({
        ensurePermissions: jest.fn().mockResolvedValue(false),
      });
      const refs = createMockRefs();
      refs.adapterRef.current = mockAdapter;
      const options = createDefaultOptions({ refs, deviceId: 'device-123' });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      await act(async () => {
        await result.current.retryEnsureDeviceReady();
      });

      const calls = (options.updateConnectionState as jest.Mock).mock.calls;
      const connectingCalls = calls.filter(
        (c: [Record<string, unknown>]) =>
          c[0]?.status === ConnectionStatus.Connecting,
      );
      expect(connectingCalls).toHaveLength(0);
    });

    it('returns early when transport unavailable', async () => {
      const mockAdapter = createMockAdapter();
      const refs = createMockRefs();
      refs.adapterRef.current = mockAdapter;
      const options = createDefaultOptions({
        refs,
        deviceId: 'device-123',
        checkTransportEnabledOrShowError: jest.fn().mockResolvedValue(true),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      await act(async () => {
        await result.current.retryEnsureDeviceReady();
      });

      const calls = (options.updateConnectionState as jest.Mock).mock.calls;
      const connectingCalls = calls.filter(
        (c: [Record<string, unknown>]) =>
          c[0]?.status === ConnectionStatus.Connecting,
      );
      expect(connectingCalls).toHaveLength(0);
    });

    it('enters connecting when deviceId and adapter present', async () => {
      const mockAdapter = createMockAdapter();
      const refs = createMockRefs();
      refs.adapterRef.current = mockAdapter;
      const options = createDefaultOptions({ refs, deviceId: 'device-123' });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      await act(async () => {
        await result.current.retryEnsureDeviceReady();
      });

      expect(options.updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Connecting,
      });
      expect(mockAdapter.ensureDeviceReady).toHaveBeenCalledWith('device-123');
    });

    it('enters scanning when no deviceId or no adapter', async () => {
      const mockAdapter = createMockAdapter();
      const refs = createMockRefs();
      refs.adapterRef.current = mockAdapter;
      const options = createDefaultOptions({ refs, deviceId: null });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      await act(async () => {
        await result.current.retryEnsureDeviceReady();
      });

      expect(options.updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Scanning,
      });
    });

    it('handles error during retry readiness check', async () => {
      const mockAdapter = createMockAdapter({
        ensureDeviceReady: jest
          .fn()
          .mockRejectedValue(new Error('retry error')),
      });
      const refs = createMockRefs();
      refs.adapterRef.current = mockAdapter;
      const options = createDefaultOptions({ refs, deviceId: 'device-123' });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      await act(async () => {
        await result.current.retryEnsureDeviceReady();
      });

      expect(options.handleError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('closeFlow', () => {
    it('clears targetWalletType and disconnects', () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      act(() => {
        result.current.closeFlow();
      });

      expect(options.setters.setTargetWalletType).toHaveBeenCalledWith(null);
      expect(options.updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Disconnected,
      });
    });

    it('resolves pending promise with false', async () => {
      const mockAdapter = createMockAdapter();
      const options = createDefaultOptions({
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
        checkTransportEnabledOrShowError: jest.fn().mockResolvedValue(true),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady(),
      );

      await act(async () => {
        result.current.closeFlow();
        const resolved = await readyPromise;
        expect(resolved).toBe(false);
      });
    });
  });

  describe('handleConnectionSuccess', () => {
    it('does not clear targetWalletType', () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      act(() => {
        result.current.handleConnectionSuccess();
      });

      expect(options.setters.setTargetWalletType).not.toHaveBeenCalled();
      expect(options.updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Disconnected,
      });
    });

    it('resolves pending readiness with true on connection success', async () => {
      const mockAdapter = createMockAdapter();
      const options = createDefaultOptions({
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
        checkTransportEnabledOrShowError: jest.fn().mockResolvedValue(true),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady(),
      );

      await act(async () => {
        result.current.handleConnectionSuccess();
        const resolved = await readyPromise;
        expect(resolved).toBe(true);
      });
    });
  });
});
