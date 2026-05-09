/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react-native';
import { ConnectionStatus, ErrorCode } from '@metamask/hw-wallet-sdk';
import { useHwConnectionMonitoring } from './useHwConnectionMonitoring';
import { updateHardwareWalletsSwaps } from '../../../../../../core/redux/slices/bridge';
import { HardwareWalletsSwapsStatus } from '../HardwareWalletsSwaps.state';

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

  it('dispatches DEVICE_DISCONNECTED when connection status is Disconnected', () => {
    mockUseHardwareWallet.mockReturnValue({
      connectionState: createDisconnectedState(),
    } as any);

    renderHook(() =>
      useHwConnectionMonitoring({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
      }),
    );

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: 'DEVICE_DISCONNECTED',
    });
  });

  it('dispatches DEVICE_DISCONNECTED for ConnectionClosed error code', () => {
    const error = new Error('connection closed');
    (parseErrorByType as jest.Mock).mockReturnValue(
      makeParsedError(ErrorCode.ConnectionClosed),
    );

    mockUseHardwareWallet.mockReturnValue({
      connectionState: createErrorState(error),
    } as any);

    renderHook(() =>
      useHwConnectionMonitoring({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
      }),
    );

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: 'DEVICE_DISCONNECTED',
    });
  });

  it('dispatches DEVICE_DISCONNECTED for DeviceDisconnected error code', () => {
    const error = new Error('device disconnected');
    (parseErrorByType as jest.Mock).mockReturnValue(
      makeParsedError(ErrorCode.DeviceDisconnected),
    );

    mockUseHardwareWallet.mockReturnValue({
      connectionState: createErrorState(error),
    } as any);

    renderHook(() =>
      useHwConnectionMonitoring({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
      }),
    );

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: 'DEVICE_DISCONNECTED',
    });
  });

  it('dispatches REJECTED for user cancellation errors', () => {
    const error = new Error('user rejected');
    (parseErrorByType as jest.Mock).mockReturnValue(
      makeParsedError(ErrorCode.UserRejected),
    );
    (isUserCancellation as jest.Mock).mockReturnValue(true);

    mockUseHardwareWallet.mockReturnValue({
      connectionState: createErrorState(error),
    } as any);

    renderHook(() =>
      useHwConnectionMonitoring({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
      }),
    );

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: 'REJECTED',
    });
  });

  it('dispatches TRANSACTION_FAILED for other errors', () => {
    const error = new Error('some error');
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
      }),
    );

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: 'TRANSACTION_FAILED',
    });
  });

  it('does not dispatch when isEnabled is false', () => {
    mockUseHardwareWallet.mockReturnValue({
      connectionState: createDisconnectedState(),
    } as any);

    renderHook(() =>
      useHwConnectionMonitoring({
        isEnabled: false,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
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
      }),
    );

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('deduplicates same error', () => {
    const error = new Error('some error');
    (parseErrorByType as jest.Mock).mockReturnValue(
      makeParsedError(ErrorCode.Unknown),
    );

    mockUseHardwareWallet.mockReturnValue({
      connectionState: createErrorState(error),
    } as any);

    const { rerender } = renderHook(() =>
      useHwConnectionMonitoring({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
      }),
    );

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledTimes(1);

    rerender(undefined as any);

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch for non-error, non-disconnected states', () => {
    mockUseHardwareWallet.mockReturnValue({
      connectionState: createReadyState(),
    } as any);

    renderHook(() =>
      useHwConnectionMonitoring({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
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
      }),
    );

    expect(result.current.isDisconnectedRef).toEqual({ current: false });
    expect(result.current.resetHandledError).toBeInstanceOf(Function);
  });
});
