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
  getTransportDisabledErrorCode: jest.fn().mockReturnValue(null),
  markFlowComplete: jest.fn(),
  ensurePermissions: jest.fn().mockResolvedValue(true),
  reset: jest.fn(),
  isFlowComplete: jest.fn().mockReturnValue(false),
  ...overrides,
});

const createMockRefs = (): HardwareWalletRefs => ({
  adapterRef: { current: null },
  isConnectingRef: { current: false },
  abortControllerRef: { current: null },
  targetWalletTypeRef: { current: null },
});

const createMockSetters = (): HardwareWalletStateSetters => ({
  setConnectionState: jest.fn(),
  setDeviceId: jest.fn(),
  setTargetWalletType: jest.fn(),
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

    it('abandons previous pending readiness check', async () => {
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

      // Start second flow (abandons first)
      const { readyPromise: secondPromise } = await capturePendingReadiness(
        () => result.current.ensureDeviceReady(),
      );

      // Close to resolve second
      await act(async () => {
        result.current.closeFlow();
        const resolved = await secondPromise;
        expect(resolved).toBe(false);
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
      const mockAdapter = createMockAdapter();
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

    it('invokes connection success callback and resolves with true', async () => {
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
