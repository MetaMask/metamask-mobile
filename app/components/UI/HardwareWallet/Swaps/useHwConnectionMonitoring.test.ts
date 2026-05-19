import { renderHook } from '@testing-library/react-native';
import {
  ConnectionStatus,
  ErrorCode,
  HardwareWalletError,
} from '@metamask/hw-wallet-sdk';
import {
  shouldIgnoreAsBaseline,
  useHwConnectionMonitoring,
} from './useHwConnectionMonitoring';
import { updateHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import {
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsEventType,
} from './HardwareWalletsSwaps.state';
import type { HardwareWalletContextValue } from '../../../../core/HardwareWallet/contexts';
import { useHardwareWallet } from '../../../../core/HardwareWallet';
import { isUserCancellation } from '../../../../core/HardwareWallet/errors/helpers';
import { parseErrorByType } from '../../../../core/HardwareWallet/errors/parser';

jest.mock('../../../../core/HardwareWallet', () => ({
  useHardwareWallet: jest.fn(),
}));

jest.mock('../../../../core/HardwareWallet/errors/helpers', () => ({
  isUserCancellation: jest.fn(),
}));

jest.mock('../../../../core/HardwareWallet/errors/parser', () => ({
  parseErrorByType: jest.fn(),
}));

jest.mock('../../../../core/redux/slices/bridge', () => ({
  updateHardwareWalletsSwaps: jest.fn((action) => action),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn((action) => action),
  useSelector: jest.fn(),
}));

const mockUseHardwareWallet = useHardwareWallet as jest.MockedFunction<
  typeof useHardwareWallet
>;

const stubContext: Omit<HardwareWalletContextValue, 'connectionState'> & {
  connectionState: HardwareWalletContextValue['connectionState'];
} = {
  walletType: null,
  deviceId: null,
  connectionState: { status: ConnectionStatus.Disconnected },
  deviceSelection: {
    devices: [],
    selectedDevice: null,
    isScanning: false,
    scanError: null,
  },
  ensureDeviceReady:
    jest.fn() as HardwareWalletContextValue['ensureDeviceReady'],
  setTargetWalletType:
    jest.fn() as HardwareWalletContextValue['setTargetWalletType'],
  setPendingOperationAddress:
    jest.fn() as HardwareWalletContextValue['setPendingOperationAddress'],
  showHardwareWalletError:
    jest.fn() as HardwareWalletContextValue['showHardwareWalletError'],
  showAwaitingConfirmation:
    jest.fn() as HardwareWalletContextValue['showAwaitingConfirmation'],
  hideAwaitingConfirmation:
    jest.fn() as HardwareWalletContextValue['hideAwaitingConfirmation'],
  qr: {
    pendingScanRequest: undefined,
    isSigningQRObject: false,
    setRequestCompleted: jest.fn(),
    isRequestCompleted: false,
    cancelQRScanRequestIfPresent: jest.fn(),
  },
};

function mockContextWith(
  connectionState: HardwareWalletContextValue['connectionState'],
): HardwareWalletContextValue {
  return { ...stubContext, connectionState };
}

function makeParsedError(code: ErrorCode): HardwareWalletError {
  return { code, message: 'test' } as unknown as HardwareWalletError;
}

function createDisconnectedState() {
  return { status: ConnectionStatus.Disconnected } as const;
}

function createErrorState(error: unknown) {
  return {
    status: ConnectionStatus.ErrorState,
    error: error as HardwareWalletError,
  } as const;
}

function createReadyState() {
  return { status: ConnectionStatus.Ready, deviceId: 'test-device' } as const;
}

function renderAndTransitionToWaiting(
  badConnectionState: ReturnType<
    typeof createDisconnectedState | typeof createErrorState
  >,
  hasActiveSigning = true,
) {
  const readyState = createReadyState();

  mockUseHardwareWallet.mockReturnValue(mockContextWith(readyState));

  const { rerender } = renderHook(
    ({ currentStatus }) =>
      useHwConnectionMonitoring({
        isEnabled: true,
        currentStatus,
        hasActiveSigning,
      }),
    { initialProps: { currentStatus: HardwareWalletsSwapsStatus.Idle } },
  );

  rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });

  mockUseHardwareWallet.mockReturnValue(mockContextWith(badConnectionState));
  rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });

  return { rerender };
}

describe('shouldIgnoreAsBaseline', () => {
  it('returns false when connection statuses differ', () => {
    expect(
      shouldIgnoreAsBaseline(
        { status: ConnectionStatus.Ready },
        { status: ConnectionStatus.Disconnected },
      ),
    ).toBe(false);
  });

  it('returns true when statuses match and are not ErrorState', () => {
    expect(
      shouldIgnoreAsBaseline(
        { status: ConnectionStatus.Ready },
        { status: ConnectionStatus.Ready },
      ),
    ).toBe(true);
  });

  it('returns true when ErrorState errors are the same reference', () => {
    const error = new Error('same error');

    expect(
      shouldIgnoreAsBaseline(
        { status: ConnectionStatus.ErrorState, error },
        { status: ConnectionStatus.ErrorState, error },
      ),
    ).toBe(true);
  });

  it('returns false when ErrorState errors differ', () => {
    expect(
      shouldIgnoreAsBaseline(
        { status: ConnectionStatus.ErrorState, error: new Error('a') },
        { status: ConnectionStatus.ErrorState, error: new Error('b') },
      ),
    ).toBe(false);
  });
});

describe('useHwConnectionMonitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHardwareWallet.mockReturnValue(mockContextWith(createReadyState()));
    (parseErrorByType as jest.Mock).mockReturnValue(
      makeParsedError(ErrorCode.Unknown),
    );
    (isUserCancellation as jest.Mock).mockReturnValue(false);
  });

  it('dispatches DEVICE_DISCONNECTED when connection state changes to Disconnected during signing', () => {
    renderAndTransitionToWaiting(createDisconnectedState());

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.DeviceDisconnected,
    });
  });

  it('ignores Disconnected readiness handoff before signing starts', () => {
    renderAndTransitionToWaiting(createDisconnectedState(), false);

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('dispatches DEVICE_DISCONNECTED again after progress re-enters Waiting', () => {
    const readyState = createReadyState();
    mockUseHardwareWallet.mockReturnValue(mockContextWith(readyState));

    const { rerender } = renderHook(
      ({ currentStatus }) =>
        useHwConnectionMonitoring({
          isEnabled: true,
          currentStatus,
          hasActiveSigning: true,
        }),
      { initialProps: { currentStatus: HardwareWalletsSwapsStatus.Idle } },
    );

    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });
    mockUseHardwareWallet.mockReturnValue(
      mockContextWith(createDisconnectedState()),
    );
    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });
    rerender({ currentStatus: HardwareWalletsSwapsStatus.Disconnected });
    mockUseHardwareWallet.mockReturnValue(mockContextWith(readyState));
    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });
    mockUseHardwareWallet.mockReturnValue(
      mockContextWith(createDisconnectedState()),
    );
    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledTimes(2);
    expect(updateHardwareWalletsSwaps).toHaveBeenNthCalledWith(1, {
      type: HardwareWalletsSwapsEventType.DeviceDisconnected,
    });
    expect(updateHardwareWalletsSwaps).toHaveBeenNthCalledWith(2, {
      type: HardwareWalletsSwapsEventType.DeviceDisconnected,
    });
  });

  it('dispatches DEVICE_DISCONNECTED for ConnectionClosed error code', () => {
    const error = new Error('connection closed');
    (parseErrorByType as jest.Mock).mockReturnValue(
      makeParsedError(ErrorCode.ConnectionClosed),
    );

    renderAndTransitionToWaiting(createErrorState(error));

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.DeviceDisconnected,
    });
  });

  it('ignores ConnectionClosed error code before signing starts', () => {
    const error = new Error('connection closed');
    (parseErrorByType as jest.Mock).mockReturnValue(
      makeParsedError(ErrorCode.ConnectionClosed),
    );

    renderAndTransitionToWaiting(createErrorState(error), false);

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('ignores DeviceDisconnected error code before signing starts', () => {
    const error = new Error('device disconnected');
    (parseErrorByType as jest.Mock).mockReturnValue(
      makeParsedError(ErrorCode.DeviceDisconnected),
    );

    renderAndTransitionToWaiting(createErrorState(error), false);

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('dispatches DEVICE_DISCONNECTED for DeviceDisconnected error code', () => {
    const error = new Error('device disconnected');
    (parseErrorByType as jest.Mock).mockReturnValue(
      makeParsedError(ErrorCode.DeviceDisconnected),
    );

    renderAndTransitionToWaiting(createErrorState(error));

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.DeviceDisconnected,
    });
  });

  it('dispatches REJECTED for user cancellation errors', () => {
    const error = new Error('user rejected');
    (parseErrorByType as jest.Mock).mockReturnValue(
      makeParsedError(ErrorCode.UserRejected),
    );
    (isUserCancellation as jest.Mock).mockReturnValue(true);

    renderAndTransitionToWaiting(createErrorState(error));

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.Rejected,
    });
  });

  it('does not dispatch transaction failure for recoverable connection errors', () => {
    const error = new Error('Bluetooth is turned off');
    (parseErrorByType as jest.Mock).mockReturnValue(
      makeParsedError(ErrorCode.Unknown),
    );
    (isUserCancellation as jest.Mock).mockReturnValue(false);

    renderAndTransitionToWaiting(createErrorState(error));

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('does not dispatch when isEnabled is false', () => {
    mockUseHardwareWallet.mockReturnValue(
      mockContextWith(createDisconnectedState()),
    );

    renderHook(() =>
      useHwConnectionMonitoring({
        isEnabled: false,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
        hasActiveSigning: true,
      }),
    );

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('does not dispatch when status is not Waiting', () => {
    mockUseHardwareWallet.mockReturnValue(
      mockContextWith(createDisconnectedState()),
    );

    renderHook(() =>
      useHwConnectionMonitoring({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Submitted,
        hasActiveSigning: true,
      }),
    );

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('does not repeatedly dispatch for ignored recoverable connection errors', () => {
    const error = new Error('Bluetooth is turned off');
    (parseErrorByType as jest.Mock).mockReturnValue(
      makeParsedError(ErrorCode.Unknown),
    );

    const { rerender } = renderAndTransitionToWaiting(createErrorState(error));

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();

    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('does not dispatch for non-error, non-disconnected states', () => {
    mockUseHardwareWallet.mockReturnValue(mockContextWith(createReadyState()));

    renderHook(() =>
      useHwConnectionMonitoring({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
        hasActiveSigning: false,
      }),
    );

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('returns resetHandledError', () => {
    mockUseHardwareWallet.mockReturnValue(mockContextWith(createReadyState()));

    const { result } = renderHook(() =>
      useHwConnectionMonitoring({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
        hasActiveSigning: true,
      }),
    );

    expect(result.current.resetHandledError).toBeInstanceOf(Function);
  });

  it('resetHandledError clears handled disconnect so a subsequent disconnect dispatches again', () => {
    const readyState = createReadyState();
    const disconnectedState = createDisconnectedState();

    mockUseHardwareWallet.mockReturnValue(mockContextWith(readyState));

    const { rerender, result } = renderHook(
      ({ currentStatus }) =>
        useHwConnectionMonitoring({
          isEnabled: true,
          currentStatus,
          hasActiveSigning: true,
        }),
      { initialProps: { currentStatus: HardwareWalletsSwapsStatus.Idle } },
    );

    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });
    mockUseHardwareWallet.mockReturnValue(mockContextWith(disconnectedState));
    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledTimes(1);

    result.current.resetHandledError();

    mockUseHardwareWallet.mockReturnValue(mockContextWith(disconnectedState));
    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledTimes(2);
  });

  it('does not dispatch DEVICE_DISCONNECTED twice for the same disconnect while Waiting', () => {
    const { rerender } = renderAndTransitionToWaiting(
      createDisconnectedState(),
    );

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledTimes(1);

    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch REJECTED twice for the same error while Waiting', () => {
    const error = new Error('user rejected');
    (parseErrorByType as jest.Mock).mockReturnValue(
      makeParsedError(ErrorCode.UserRejected),
    );
    (isUserCancellation as jest.Mock).mockReturnValue(true);

    const { rerender } = renderAndTransitionToWaiting(createErrorState(error));

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledTimes(1);

    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledTimes(1);
  });

  it('ignores pre-existing Disconnected state when first entering Waiting', () => {
    mockUseHardwareWallet.mockReturnValue(
      mockContextWith(createDisconnectedState()),
    );

    renderHook(() =>
      useHwConnectionMonitoring({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
        hasActiveSigning: false,
      }),
    );

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('ignores pre-existing ErrorState when first entering Waiting', () => {
    const error = new Error('stale error');
    (parseErrorByType as jest.Mock).mockReturnValue(
      makeParsedError(ErrorCode.Unknown),
    );
    (isUserCancellation as jest.Mock).mockReturnValue(false);

    mockUseHardwareWallet.mockReturnValue(
      mockContextWith(createErrorState(error)),
    );

    renderHook(() =>
      useHwConnectionMonitoring({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
        hasActiveSigning: false,
      }),
    );

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('dispatches after recovery when a new ErrorState occurs following stale baseline', () => {
    const staleError = new Error('stale error');
    const newError = new Error('device disconnected');
    (parseErrorByType as jest.Mock).mockImplementation((error: unknown) => {
      if (error === newError) {
        return makeParsedError(ErrorCode.DeviceDisconnected);
      }
      return makeParsedError(ErrorCode.Unknown);
    });

    const readyState = createReadyState();
    mockUseHardwareWallet.mockReturnValue(
      mockContextWith(createErrorState(staleError)),
    );

    const { rerender } = renderHook(
      ({ currentStatus }) =>
        useHwConnectionMonitoring({
          isEnabled: true,
          currentStatus,
          hasActiveSigning: true,
        }),
      { initialProps: { currentStatus: HardwareWalletsSwapsStatus.Waiting } },
    );

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();

    mockUseHardwareWallet.mockReturnValue(mockContextWith(readyState));
    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });

    mockUseHardwareWallet.mockReturnValue(
      mockContextWith(createErrorState(newError)),
    );
    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.DeviceDisconnected,
    });
  });

  it('dispatches after recovery when Disconnected re-occurs following stale baseline', () => {
    const readyState = createReadyState();
    mockUseHardwareWallet.mockReturnValue(
      mockContextWith(createDisconnectedState()),
    );

    const { rerender } = renderHook(
      ({ currentStatus }) =>
        useHwConnectionMonitoring({
          isEnabled: true,
          currentStatus,
          hasActiveSigning: true,
        }),
      { initialProps: { currentStatus: HardwareWalletsSwapsStatus.Waiting } },
    );

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();

    mockUseHardwareWallet.mockReturnValue(mockContextWith(readyState));
    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });

    mockUseHardwareWallet.mockReturnValue(
      mockContextWith(createDisconnectedState()),
    );
    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.DeviceDisconnected,
    });
  });

  it('clears handled error when connection recovers from error to ready', () => {
    const error = new Error('temp error');
    (parseErrorByType as jest.Mock).mockReturnValue(
      makeParsedError(ErrorCode.Unknown),
    );
    (isUserCancellation as jest.Mock).mockReturnValue(false);

    const readyState = createReadyState();
    mockUseHardwareWallet.mockReturnValue(mockContextWith(readyState));

    const { rerender } = renderHook(
      ({ currentStatus }) =>
        useHwConnectionMonitoring({
          isEnabled: true,
          currentStatus,
          hasActiveSigning: true,
        }),
      { initialProps: { currentStatus: HardwareWalletsSwapsStatus.Idle } },
    );

    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });
    mockUseHardwareWallet.mockReturnValue(
      mockContextWith(createErrorState(error)),
    );
    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();

    mockUseHardwareWallet.mockReturnValue(mockContextWith(readyState));
    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });

    mockUseHardwareWallet.mockReturnValue(
      mockContextWith(createErrorState(error)),
    );
    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });
});
