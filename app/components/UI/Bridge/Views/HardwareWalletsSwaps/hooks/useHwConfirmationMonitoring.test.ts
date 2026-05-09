import { renderHook } from '@testing-library/react-native';
import { useHwConfirmationMonitoring } from './useHwConfirmationMonitoring';
import { updateHardwareWalletsSwaps } from '../../../../../../core/redux/slices/bridge';
import { HardwareWalletsSwapsStatus } from '../HardwareWalletsSwaps.state';

jest.mock('../../../../../../core/redux/slices/bridge', () => ({
  updateHardwareWalletsSwaps: jest.fn((action) => action),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn((action) => action),
  useSelector: jest.fn(),
}));

describe('useHwConfirmationMonitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches REJECTED when confirmation tx ID goes from defined to undefined while waiting', () => {
    const { rerender } = renderHook(
      ({ confirmationTxId }: { confirmationTxId?: string }) =>
        useHwConfirmationMonitoring({
          isEnabled: true,
          currentStatus: HardwareWalletsSwapsStatus.Waiting,
          confirmationTxId,
          isDeviceDisconnected: false,
        }),
      { initialProps: { confirmationTxId: 'tx-123' as string | undefined } },
    );

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();

    rerender({ confirmationTxId: undefined });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: 'REJECTED',
    });
  });

  it('does not dispatch when isEnabled is false', () => {
    const { rerender } = renderHook(
      ({ confirmationTxId }: { confirmationTxId?: string }) =>
        useHwConfirmationMonitoring({
          isEnabled: false,
          currentStatus: HardwareWalletsSwapsStatus.Waiting,
          confirmationTxId,
          isDeviceDisconnected: false,
        }),
      { initialProps: { confirmationTxId: 'tx-123' as string | undefined } },
    );

    rerender({ confirmationTxId: undefined });

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('does not dispatch when device is disconnected', () => {
    const { rerender } = renderHook(
      ({ confirmationTxId }: { confirmationTxId?: string }) =>
        useHwConfirmationMonitoring({
          isEnabled: true,
          currentStatus: HardwareWalletsSwapsStatus.Waiting,
          confirmationTxId,
          isDeviceDisconnected: true,
        }),
      { initialProps: { confirmationTxId: 'tx-123' as string | undefined } },
    );

    rerender({ confirmationTxId: undefined });

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('does not dispatch when status is not Waiting', () => {
    const { rerender } = renderHook(
      ({ confirmationTxId }: { confirmationTxId?: string }) =>
        useHwConfirmationMonitoring({
          isEnabled: true,
          currentStatus: HardwareWalletsSwapsStatus.Submitted,
          confirmationTxId,
          isDeviceDisconnected: false,
        }),
      { initialProps: { confirmationTxId: 'tx-123' as string | undefined } },
    );

    rerender({ confirmationTxId: undefined });

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('does not dispatch when tx ID was never defined', () => {
    const { rerender } = renderHook(
      ({ confirmationTxId }: { confirmationTxId?: string }) =>
        useHwConfirmationMonitoring({
          isEnabled: true,
          currentStatus: HardwareWalletsSwapsStatus.Waiting,
          confirmationTxId,
          isDeviceDisconnected: false,
        }),
      { initialProps: { confirmationTxId: undefined } },
    );

    rerender({ confirmationTxId: undefined });

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });
});
