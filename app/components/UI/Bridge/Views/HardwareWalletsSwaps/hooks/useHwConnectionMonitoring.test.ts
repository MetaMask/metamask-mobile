/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react-native';
import { ConnectionStatus, ErrorCode } from '@metamask/hw-wallet-sdk';
import { useHwConnectionMonitoring } from './useHwConnectionMonitoring';
import { updateHardwareWalletsSwaps } from '../../../../../../core/redux/slices/bridge';
import { HardwareWalletsSwapsStatus, HardwareWalletsSwapsEventType } from '../HardwareWalletsSwaps.state';

jest.mock('../../../../../../core/HardwareWallet', () => ({
  useHardwareWallet: jest.fn(),
}));

jest.mock('../../../../../../core/HardwareWallet/errors/helpers', () => ({
  isUserCancellation: jest.fn(),
}));

jest.mock('../../../../../../core/HardwareWallet/errors/parser', () => ({
  parseErrorByType: jest.fn(),
}));

jest.mock('../../../../../../core/redux/slices/bridge', () => ({
  updateHardwareWalletsSwaps: jest.fn((action) => action),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn((action) => action),
  useSelector: jest.fn(),
}));

import { useHardwareWallet } from '../../../../../../core/HardwareWallet';
import { isUserCancellation } from '../../../../../../core/HardwareWallet/errors/helpers';
import { parseErrorByType } from '../../../../../../core/HardwareWallet/errors/parser';

const mockUseHardwareWallet = useHardwareWallet as jest.MockedFunction<
  typeof useHardwareWallet
>;

function makeParsedError(code: ErrorCode) {
  return { code, message: 'test' } as any;
}

function createDisconnectedState() {
  return { status: ConnectionStatus.Disconnected };
}

function createErrorState(error: unknown) {
  return { status: ConnectionStatus.ErrorState, error };
}

function createReadyState() {
  return { status: ConnectionStatus.Ready, deviceId: 'test-device' };
}

function renderAndTransitionToWaiting(
  badConnectionState: ReturnType<
    typeof createDisconnectedState | typeof createErrorState
  >,
  hasActiveSigning = true,
) {
  const readyState = createReadyState();

  mockUseHardwareWallet.mockReturnValue({
    connectionState: readyState,
  } as any);

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

  mockUseHardwareWallet.mockReturnValue({
    connectionState: badConnectionState,
  } as any);
  rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });

  return { rerender };
}

describe('useHwConnectionMonitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHardwareWallet.mockReturnValue({
      connectionState: createReadyState(),
    } as any);
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
    mockUseHardwareWallet.mockReturnValue({
      connectionState: readyState,
    } as any);

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
    mockUseHardwareWallet.mockReturnValue({
      connectionState: createDisconnectedState(),
    } as any);
    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });
    rerender({ currentStatus: HardwareWalletsSwapsStatus.Disconnected });
    mockUseHardwareWallet.mockReturnValue({
      connectionState: readyState,
    } as any);
    rerender({ currentStatus: HardwareWalletsSwapsStatus.Waiting });
    mockUseHardwareWallet.mockReturnValue({
      connectionState: createDisconnectedState(),
    } as any);
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
    mockUseHardwareWallet.mockReturnValue({
      connectionState: createDisconnectedState(),
    } as any);

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
    mockUseHardwareWallet.mockReturnValue({
      connectionState: createDisconnectedState(),
    } as any);

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
    mockUseHardwareWallet.mockReturnValue({
      connectionState: createReadyState(),
    } as any);

    renderHook(() =>
      useHwConnectionMonitoring({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
        hasActiveSigning: false,
      }),
    );

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('returns isDisconnectedRef and resetHandledError', () => {
    mockUseHardwareWallet.mockReturnValue({
      connectionState: createReadyState(),
    } as any);

    const { result } = renderHook(() =>
      useHwConnectionMonitoring({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
        hasActiveSigning: true,
      }),
    );

    expect(result.current.isDisconnectedRef).toEqual({ current: false });
    expect(result.current.resetHandledError).toBeInstanceOf(Function);
  });

  it('ignores pre-existing Disconnected state when first entering Waiting', () => {
    mockUseHardwareWallet.mockReturnValue({
      connectionState: createDisconnectedState(),
    } as any);

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

    mockUseHardwareWallet.mockReturnValue({
      connectionState: createErrorState(error),
    } as any);

    renderHook(() =>
      useHwConnectionMonitoring({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
        hasActiveSigning: false,
      }),
    );

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });
});
