import {
  ErrorCode,
  ConnectionStatus,
  HardwareWalletType,
  HardwareWalletError,
  Severity,
  Category,
  type HardwareWalletConnectionState,
} from '@metamask/hw-wallet-sdk';
import { TransactionType } from '@metamask/transaction-controller';
import {
  HardwareWalletAnalyticsErrorType,
  HardwareWalletAnalyticsFlow,
  getAnalyticsErrorType,
  getErrorTypeFromConnectionState,
  getAnalyticsDeviceType,
  getErrorDetails,
  getAnalyticsFlowFromApproval,
} from './helpers';

describe('analytics helpers', () => {
  describe('getAnalyticsErrorType', () => {
    it('maps AuthenticationDeviceLocked to Device Locked', () => {
      expect(getAnalyticsErrorType(ErrorCode.AuthenticationDeviceLocked)).toBe(
        HardwareWalletAnalyticsErrorType.DeviceLocked,
      );
    });

    it('maps AuthenticationDeviceBlocked to Device Locked', () => {
      expect(getAnalyticsErrorType(ErrorCode.AuthenticationDeviceBlocked)).toBe(
        HardwareWalletAnalyticsErrorType.DeviceLocked,
      );
    });

    it('maps DeviceDisconnected to Device Disconnected', () => {
      expect(getAnalyticsErrorType(ErrorCode.DeviceDisconnected)).toBe(
        HardwareWalletAnalyticsErrorType.DeviceDisconnected,
      );
    });

    it('maps DeviceNotFound to Device Disconnected', () => {
      expect(getAnalyticsErrorType(ErrorCode.DeviceNotFound)).toBe(
        HardwareWalletAnalyticsErrorType.DeviceDisconnected,
      );
    });

    it('maps DeviceNotReady to Device Disconnected', () => {
      expect(getAnalyticsErrorType(ErrorCode.DeviceNotReady)).toBe(
        HardwareWalletAnalyticsErrorType.DeviceDisconnected,
      );
    });

    it('maps DeviceUnresponsive to Device Disconnected', () => {
      expect(getAnalyticsErrorType(ErrorCode.DeviceUnresponsive)).toBe(
        HardwareWalletAnalyticsErrorType.DeviceDisconnected,
      );
    });

    it('maps ConnectionClosed to Device Disconnected', () => {
      expect(getAnalyticsErrorType(ErrorCode.ConnectionClosed)).toBe(
        HardwareWalletAnalyticsErrorType.DeviceDisconnected,
      );
    });

    it('maps ConnectionTimeout to Device Disconnected', () => {
      expect(getAnalyticsErrorType(ErrorCode.ConnectionTimeout)).toBe(
        HardwareWalletAnalyticsErrorType.DeviceDisconnected,
      );
    });

    it('maps DeviceStateEthAppClosed to Ethereum App Not Opened', () => {
      expect(getAnalyticsErrorType(ErrorCode.DeviceStateEthAppClosed)).toBe(
        HardwareWalletAnalyticsErrorType.EthereumAppNotOpened,
      );
    });

    it('maps DeviceMissingCapability to Ethereum App Not Opened', () => {
      expect(getAnalyticsErrorType(ErrorCode.DeviceMissingCapability)).toBe(
        HardwareWalletAnalyticsErrorType.EthereumAppNotOpened,
      );
    });

    it('maps BluetoothDisabled to Bluetooth Disabled', () => {
      expect(getAnalyticsErrorType(ErrorCode.BluetoothDisabled)).toBe(
        HardwareWalletAnalyticsErrorType.BluetoothDisabled,
      );
    });

    it('maps PermissionBluetoothDenied to Bluetooth Disabled', () => {
      expect(getAnalyticsErrorType(ErrorCode.PermissionBluetoothDenied)).toBe(
        HardwareWalletAnalyticsErrorType.BluetoothDisabled,
      );
    });

    it('maps DeviceStateBlindSignNotSupported to Blind Signing Not Enabled', () => {
      expect(
        getAnalyticsErrorType(ErrorCode.DeviceStateBlindSignNotSupported),
      ).toBe(HardwareWalletAnalyticsErrorType.BlindSigningNotEnabled);
    });

    it('maps Unknown to Generic Error', () => {
      expect(getAnalyticsErrorType(ErrorCode.Unknown)).toBe(
        HardwareWalletAnalyticsErrorType.GenericError,
      );
    });

    it('maps UserRejected to Generic Error', () => {
      expect(getAnalyticsErrorType(ErrorCode.UserRejected)).toBe(
        HardwareWalletAnalyticsErrorType.GenericError,
      );
    });

    it('maps unmapped codes to Generic Error', () => {
      expect(getAnalyticsErrorType(999 as ErrorCode)).toBe(
        HardwareWalletAnalyticsErrorType.GenericError,
      );
    });
  });

  describe('getErrorTypeFromConnectionState', () => {
    it('returns error type for ErrorState status', () => {
      const error = new HardwareWalletError('Disconnected', {
        code: ErrorCode.DeviceDisconnected,
        severity: Severity.Err,
        category: Category.Connection,
        userMessage: 'Disconnected',
      });

      const state: HardwareWalletConnectionState = {
        status: ConnectionStatus.ErrorState,
        error,
      };

      expect(getErrorTypeFromConnectionState(state)).toBe(
        HardwareWalletAnalyticsErrorType.DeviceDisconnected,
      );
    });

    it('returns Ethereum App Not Opened for AwaitingApp status', () => {
      const state: HardwareWalletConnectionState = {
        status: ConnectionStatus.AwaitingApp,
        deviceId: 'device-123',
        appName: 'Ethereum',
      };

      expect(getErrorTypeFromConnectionState(state)).toBe(
        HardwareWalletAnalyticsErrorType.EthereumAppNotOpened,
      );
    });

    it('returns null for Disconnected status', () => {
      const state: HardwareWalletConnectionState = {
        status: ConnectionStatus.Disconnected,
      };

      expect(getErrorTypeFromConnectionState(state)).toBeNull();
    });

    it('returns null for Ready status', () => {
      const state: HardwareWalletConnectionState = {
        status: ConnectionStatus.Ready,
      };

      expect(getErrorTypeFromConnectionState(state)).toBeNull();
    });

    it('returns null for Connecting status', () => {
      const state: HardwareWalletConnectionState = {
        status: ConnectionStatus.Connecting,
      };

      expect(getErrorTypeFromConnectionState(state)).toBeNull();
    });
  });

  describe('getAnalyticsDeviceType', () => {
    it('returns Ledger for Ledger type', () => {
      expect(getAnalyticsDeviceType(HardwareWalletType.Ledger)).toBe('Ledger');
    });

    it('returns Trezor for Trezor type', () => {
      expect(getAnalyticsDeviceType(HardwareWalletType.Trezor)).toBe('Trezor');
    });

    it('returns QR Hardware for Qr type', () => {
      expect(getAnalyticsDeviceType(HardwareWalletType.Qr)).toBe('QR Hardware');
    });

    it('returns OneKey for OneKey type', () => {
      expect(getAnalyticsDeviceType(HardwareWalletType.OneKey)).toBe('OneKey');
    });

    it('returns Lattice for Lattice type', () => {
      expect(getAnalyticsDeviceType(HardwareWalletType.Lattice)).toBe(
        'Lattice',
      );
    });

    it('returns Unknown for null', () => {
      expect(getAnalyticsDeviceType(null)).toBe('Unknown');
    });

    it('returns Unknown for Unknown type', () => {
      expect(getAnalyticsDeviceType(HardwareWalletType.Unknown)).toBe(
        'Unknown',
      );
    });
  });

  describe('getErrorDetails', () => {
    it('returns error_code and error_message from ErrorState', () => {
      const error = new HardwareWalletError('Device disconnected', {
        code: ErrorCode.DeviceDisconnected,
        severity: Severity.Err,
        category: Category.Connection,
        userMessage: 'Your device was disconnected',
      });

      const state: HardwareWalletConnectionState = {
        status: ConnectionStatus.ErrorState,
        error,
      };

      const result = getErrorDetails(state);
      expect(result.error_code).toBe(String(ErrorCode.DeviceDisconnected));
      expect(result.error_message).toBe('Your device was disconnected');
    });

    it('returns details from AwaitingApp state', () => {
      const state: HardwareWalletConnectionState = {
        status: ConnectionStatus.AwaitingApp,
        deviceId: 'device-123',
        appName: 'Ethereum',
      };

      const result = getErrorDetails(state);
      expect(result.error_code).toBe(String(ErrorCode.DeviceStateEthAppClosed));
      expect(result.error_message).toContain('Ethereum');
    });

    it('defaults appName to Ethereum when not provided', () => {
      const state: HardwareWalletConnectionState = {
        status: ConnectionStatus.AwaitingApp,
        deviceId: 'device-123',
      };

      const result = getErrorDetails(state);
      expect(result.error_message).toContain('Ethereum');
    });

    it('returns empty strings for non-error states', () => {
      const state: HardwareWalletConnectionState = {
        status: ConnectionStatus.Disconnected,
      };

      const result = getErrorDetails(state);
      expect(result.error_code).toBe('');
      expect(result.error_message).toBe('');
    });
  });

  describe('getAnalyticsFlowFromApproval', () => {
    it('returns Message for personal_sign', () => {
      expect(
        getAnalyticsFlowFromApproval({ approvalType: 'personal_sign' }),
      ).toBe(HardwareWalletAnalyticsFlow.Message);
    });

    it('returns Message for eth_signTypedData', () => {
      expect(
        getAnalyticsFlowFromApproval({ approvalType: 'eth_signTypedData' }),
      ).toBe(HardwareWalletAnalyticsFlow.Message);
    });

    it('returns Send for simpleSend', () => {
      expect(
        getAnalyticsFlowFromApproval({
          approvalType: 'transaction',
          transactionType: TransactionType.simpleSend,
        }),
      ).toBe(HardwareWalletAnalyticsFlow.Send);
    });

    it('returns Send for tokenMethodTransfer', () => {
      expect(
        getAnalyticsFlowFromApproval({
          approvalType: 'transaction',
          transactionType: TransactionType.tokenMethodTransfer,
        }),
      ).toBe(HardwareWalletAnalyticsFlow.Send);
    });

    it('returns Send for tokenMethodTransferFrom', () => {
      expect(
        getAnalyticsFlowFromApproval({
          approvalType: 'transaction',
          transactionType: TransactionType.tokenMethodTransferFrom,
        }),
      ).toBe(HardwareWalletAnalyticsFlow.Send);
    });

    it('returns Swaps for swap', () => {
      expect(
        getAnalyticsFlowFromApproval({
          approvalType: 'transaction',
          transactionType: TransactionType.swap,
        }),
      ).toBe(HardwareWalletAnalyticsFlow.Swaps);
    });

    it('returns Swaps for swapApproval', () => {
      expect(
        getAnalyticsFlowFromApproval({
          approvalType: 'transaction',
          transactionType: TransactionType.swapApproval,
        }),
      ).toBe(HardwareWalletAnalyticsFlow.Swaps);
    });

    it('returns Swaps for bridge', () => {
      expect(
        getAnalyticsFlowFromApproval({
          approvalType: 'transaction',
          transactionType: TransactionType.bridge,
        }),
      ).toBe(HardwareWalletAnalyticsFlow.Swaps);
    });

    it('returns Swaps for bridgeApproval', () => {
      expect(
        getAnalyticsFlowFromApproval({
          approvalType: 'transaction',
          transactionType: TransactionType.bridgeApproval,
        }),
      ).toBe(HardwareWalletAnalyticsFlow.Swaps);
    });

    it('returns Transaction for contractInteraction', () => {
      expect(
        getAnalyticsFlowFromApproval({
          approvalType: 'transaction',
          transactionType: TransactionType.contractInteraction,
        }),
      ).toBe(HardwareWalletAnalyticsFlow.Transaction);
    });

    it('returns Connection for transaction without type', () => {
      expect(
        getAnalyticsFlowFromApproval({ approvalType: 'transaction' }),
      ).toBe(HardwareWalletAnalyticsFlow.Connection);
    });

    it('returns Connection when no approvalType', () => {
      expect(getAnalyticsFlowFromApproval({})).toBe(
        HardwareWalletAnalyticsFlow.Connection,
      );
    });

    it('returns Connection for undefined approvalType', () => {
      expect(getAnalyticsFlowFromApproval({ approvalType: undefined })).toBe(
        HardwareWalletAnalyticsFlow.Connection,
      );
    });
  });
});
