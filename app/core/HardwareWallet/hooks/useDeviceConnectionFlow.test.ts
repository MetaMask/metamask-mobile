import { renderHook, act } from '@testing-library/react-native';
import {
  HardwareWalletType,
  ConnectionStatus,
  ErrorCode,
  HardwareWalletError,
} from '@metamask/hw-wallet-sdk';
import { flushPromises as flushAllPromises } from '../../../util/test/utils';
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
  flowActiveRef: { current: false },
  ...overrides,
});

const flushPromises = async () => {
  await act(async () => {
    await flushAllPromises();
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

      const rejection = await act(() =>
        result.current.ensureDeviceReady().catch((error: unknown) => error),
      );

      expect(rejection).toBeInstanceOf(HardwareWalletError);
      expect(rejection).toMatchObject({
        code: ErrorCode.Unknown,
        message: 'ensureDeviceReady called without a wallet type',
      });
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

      // Not-ready must not be treated as a terminal handleError — fall through
      // so the bottom sheet can guide the user (open app / unlock).
      expect(options.handleError).not.toHaveBeenCalled();
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
      const options = createDefaultOptions({
        refs,
        createAdapterWithCallbacks: jest
          .fn()
          .mockReturnValue(createMockAdapter()),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      // Arm the flow first — connect is only invoked from the bottom sheet
      // while a connection flow is active.
      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady(),
      );
      expect(options.flowActiveRef.current).toBe(true);
      // The mocked initializeAdapter never assigns the adapter, so connect
      // runs with no adapter available.
      expect(refs.adapterRef.current).toBeNull();

      await act(async () => {
        await result.current.connect('device-123');
      });

      expect(options.handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ErrorCode.DeviceNotReady,
          message: 'No adapter available',
        }),
      );

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
    });

    it('connects and runs readiness check', async () => {
      // Report "not ready" so the pending promise stays unresolved; otherwise
      // connect() treats the already-resolved flow as cancelled and bails early.
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

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
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

      // Arm the flow first — the retry button only exists while the flow is
      // active (bottom sheet mounted).
      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady('device-123'),
      );
      await flushPromises();
      expect(options.flowActiveRef.current).toBe(true);
      (options.handleError as jest.Mock).mockClear();

      await act(async () => {
        await result.current.retryEnsureDeviceReady();
      });

      expect(options.handleError).toHaveBeenCalledWith(expect.any(Error));

      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
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

  describe('flowActiveRef gating', () => {
    it('arms flowActiveRef when a flow starts and clears it when closeFlow resolves the pending promise false', async () => {
      const mockAdapter = createMockAdapter();
      const options = createDefaultOptions({
        createAdapterWithCallbacks: jest.fn().mockReturnValue(mockAdapter),
        checkTransportEnabledOrShowError: jest.fn().mockResolvedValue(true),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady(),
      );

      expect(options.flowActiveRef.current).toBe(true);

      await act(async () => {
        result.current.closeFlow();
        const resolved = await readyPromise;
        expect(resolved).toBe(false);
      });

      expect(options.flowActiveRef.current).toBe(false);
    });

    it('does not route a late failure through handleError once the flow is closed', async () => {
      const mockAdapter = createMockAdapter({
        ensureDeviceReady: jest.fn().mockRejectedValue(new Error('late fail')),
      });
      const refs = createMockRefs();
      refs.adapterRef.current = mockAdapter;
      const options = createDefaultOptions({ refs, deviceId: 'device-123' });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      // While the flow is active, the readiness failure surfaces normally.
      const { readyPromise } = await capturePendingReadiness(() =>
        result.current.ensureDeviceReady('device-123'),
      );
      await flushPromises();
      expect(options.handleError).toHaveBeenCalledTimes(1);
      expect(options.flowActiveRef.current).toBe(true);

      // Closing the flow arms the guard.
      await act(async () => {
        result.current.closeFlow();
        await readyPromise;
      });
      expect(options.flowActiveRef.current).toBe(false);
      (options.handleError as jest.Mock).mockClear();

      // A failure routed through the internal handleError after closeFlow
      // must not surface an error state (guard active).
      await act(async () => {
        await result.current.retryEnsureDeviceReady();
      });

      expect(options.handleError).not.toHaveBeenCalled();
    });
  });
});
