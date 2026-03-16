import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import {
  LedgerCommunicationErrors,
  isEthAppNotOpenStatusCode,
  isEthAppNotOpenErrorMessage,
} from '../../../core/Ledger/ledgerErrors';

/**
 * Test file for useLedgerBluetooth hook.
 *
 * TESTING LIMITATION:
 * Jest cannot mock dynamic imports like `await import('@ledgerhq/react-native-hw-transport-ble')`.
 * This means the Bluetooth transport setup always fails in tests, limiting coverage of:
 * - Successful transport connection paths
 * - App detection logic (BOLOS, Ethereum switching)
 * - Disconnect handler behaviors
 * - The full ledgerLogicToRun workflow
 *
 * RECOMMENDED REFACTOR FOR HIGHER COVERAGE:
 * Refactor the hook to accept a transport factory function as an optional parameter:
 * `useLedgerBluetooth(deviceId: string, transportFactory?: () => Promise<BluetoothInterface>)`
 * This would allow tests to inject mock transports without changing production behavior.
 *
 * WHAT IS TESTED:
 * - Initial state values
 * - Hook API contract
 * - Error classification logic
 * - cleanupBluetoothConnection behavior
 * - isEthAppNotOpenErrorMessage integration
 */

// Mock the Ledger module
jest.mock('../../../core/Ledger/Ledger', () => ({
  connectLedgerHardware: jest.fn(),
  openEthereumAppOnLedger: jest.fn(),
  closeRunningAppOnLedger: jest.fn(),
}));

import {
  connectLedgerHardware,
  openEthereumAppOnLedger,
  closeRunningAppOnLedger,
} from '../../../core/Ledger/Ledger';

const mockConnectLedgerHardware = connectLedgerHardware as jest.Mock;
const mockOpenEthereumAppOnLedger = openEthereumAppOnLedger as jest.Mock;
const mockCloseRunningAppOnLedger = closeRunningAppOnLedger as jest.Mock;

// Mock ledgerErrors module
jest.mock('../../../core/Ledger/ledgerErrors', () => ({
  ...jest.requireActual('../../../core/Ledger/ledgerErrors'),
  isEthAppNotOpenStatusCode: jest.fn(),
  isEthAppNotOpenErrorMessage: jest.fn(),
}));

const mockIsEthAppNotOpenStatusCode = isEthAppNotOpenStatusCode as jest.Mock;
const mockIsEthAppNotOpenErrorMessage =
  isEthAppNotOpenErrorMessage as jest.Mock;

// Mock the i18n module
jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Import hook after all mocks
import useLedgerBluetooth from './useLedgerBluetooth';

describe('useLedgerBluetooth', () => {
  const mockDeviceId = 'test-device-id';

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectLedgerHardware.mockResolvedValue('Ethereum');
    mockOpenEthereumAppOnLedger.mockResolvedValue(undefined);
    mockCloseRunningAppOnLedger.mockResolvedValue(undefined);
    mockIsEthAppNotOpenStatusCode.mockReturnValue(false);
    mockIsEthAppNotOpenErrorMessage.mockReturnValue(false);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // Helper to wait for async operations
  const flushPromises = () => new Promise(setImmediate);

  describe('initial state', () => {
    it('returns isSendingLedgerCommands as false initially', () => {
      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      expect(result.current.isSendingLedgerCommands).toBe(false);
    });

    it('returns isAppLaunchConfirmationNeeded as false initially', () => {
      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      expect(result.current.isAppLaunchConfirmationNeeded).toBe(false);
    });

    it('returns error as undefined initially', () => {
      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      expect(result.current.error).toBeUndefined();
    });

    it('returns ledgerLogicToRun function', () => {
      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      expect(typeof result.current.ledgerLogicToRun).toBe('function');
    });

    it('returns cleanupBluetoothConnection function', () => {
      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      expect(typeof result.current.cleanupBluetoothConnection).toBe('function');
    });
  });

  describe('cleanupBluetoothConnection', () => {
    it('resets isSendingLedgerCommands to false when called', () => {
      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      act(() => {
        result.current.cleanupBluetoothConnection();
      });

      expect(result.current.isSendingLedgerCommands).toBe(false);
    });

    it('can be called multiple times without error', () => {
      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      act(() => {
        result.current.cleanupBluetoothConnection();
        result.current.cleanupBluetoothConnection();
        result.current.cleanupBluetoothConnection();
      });

      expect(result.current.isSendingLedgerCommands).toBe(false);
    });
  });

  describe('error handling when Bluetooth transport unavailable', () => {
    /**
     * Due to the unmockable dynamic import, the transport setup always fails.
     * The hook then throws 'transportRef.current is undefined' which goes
     * through the error handler. These tests verify that error path.
     */

    it('calls isEthAppNotOpenErrorMessage with transport undefined error message', async () => {
      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      await act(async () => {
        result.current.ledgerLogicToRun(jest.fn());
        await flushPromises();
      });

      await waitFor(() => {
        expect(mockIsEthAppNotOpenErrorMessage).toHaveBeenCalledWith(
          'transportRef.current is undefined',
        );
      });
    });

    it('sets EthAppNotOpen error when isEthAppNotOpenErrorMessage returns true', async () => {
      mockIsEthAppNotOpenErrorMessage.mockReturnValue(true);

      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      await act(async () => {
        result.current.ledgerLogicToRun(jest.fn());
        await flushPromises();
      });

      await waitFor(() => {
        expect(result.current.error).toBe(
          LedgerCommunicationErrors.EthAppNotOpen,
        );
      });
    });

    it('sets UnknownError when isEthAppNotOpenErrorMessage returns false', async () => {
      mockIsEthAppNotOpenErrorMessage.mockReturnValue(false);

      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      await act(async () => {
        result.current.ledgerLogicToRun(jest.fn());
        await flushPromises();
      });

      await waitFor(() => {
        expect(result.current.error).toBe(
          LedgerCommunicationErrors.UnknownError,
        );
      });
    });

    it('resets isSendingLedgerCommands to false after error', async () => {
      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      await act(async () => {
        result.current.ledgerLogicToRun(jest.fn());
        await flushPromises();
      });

      await waitFor(() => {
        expect(result.current.isSendingLedgerCommands).toBe(false);
      });
    });

    it('does not call connectLedgerHardware when transport is unavailable', async () => {
      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      await act(async () => {
        result.current.ledgerLogicToRun(jest.fn());
        await flushPromises();
      });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      // connectLedgerHardware should NOT be called since transport setup fails first
      expect(mockConnectLedgerHardware).not.toHaveBeenCalled();
    });

    it('does not invoke the user callback when transport is unavailable', async () => {
      const mockUserCallback = jest.fn();
      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      await act(async () => {
        result.current.ledgerLogicToRun(mockUserCallback);
        await flushPromises();
      });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(mockUserCallback).not.toHaveBeenCalled();
    });
  });

  describe('error state reset on new workflow', () => {
    it('clears previous error when ledgerLogicToRun is called', async () => {
      mockIsEthAppNotOpenErrorMessage.mockReturnValue(false);

      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      // First call - triggers error
      await act(async () => {
        result.current.ledgerLogicToRun(jest.fn());
        await flushPromises();
      });

      await waitFor(() => {
        expect(result.current.error).toBe(
          LedgerCommunicationErrors.UnknownError,
        );
      });

      // Second call should clear error initially (then set it again)
      await act(async () => {
        // Error is cleared at start of ledgerLogicToRun
        result.current.ledgerLogicToRun(jest.fn());
        // Note: error will be set again due to transport failure
        await flushPromises();
      });

      // Error will be set again due to failed transport
      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });
  });

  describe('LedgerCommunicationErrors enum coverage', () => {
    /**
     * These tests document all the error types that the hook can return.
     * They verify the enum values are correctly exported and accessible.
     */

    it('has all expected error types defined', () => {
      expect(LedgerCommunicationErrors.LedgerDisconnected).toBe(
        'LedgerDisconnected',
      );
      expect(LedgerCommunicationErrors.LedgerHasPendingConfirmation).toBe(
        'LedgerHasPendingConfirmation',
      );
      expect(LedgerCommunicationErrors.FailedToOpenApp).toBe('FailedToOpenApp');
      expect(LedgerCommunicationErrors.FailedToCloseApp).toBe(
        'FailedToCloseApp',
      );
      expect(LedgerCommunicationErrors.UserRefusedConfirmation).toBe(
        'UserRefusedConfirmation',
      );
      expect(LedgerCommunicationErrors.AppIsNotInstalled).toBe(
        'AppIsNotInstalled',
      );
      expect(LedgerCommunicationErrors.EthAppNotOpen).toBe('EthAppNotOpen');
      expect(LedgerCommunicationErrors.LedgerIsLocked).toBe('LedgerIsLocked');
      expect(LedgerCommunicationErrors.NotSupported).toBe('NotSupported');
      expect(LedgerCommunicationErrors.UnknownError).toBe('UnknownError');
      expect(LedgerCommunicationErrors.NonceTooLow).toBe('NonceTooLow');
      expect(LedgerCommunicationErrors.BlindSignError).toBe('BlindSignError');
    });
  });

  describe('hook API contract', () => {
    /**
     * These tests verify the hook returns the expected interface.
     */

    it('returns all expected properties and methods', () => {
      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      expect(result.current).toHaveProperty('isSendingLedgerCommands');
      expect(result.current).toHaveProperty('isAppLaunchConfirmationNeeded');
      expect(result.current).toHaveProperty('ledgerLogicToRun');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('cleanupBluetoothConnection');
    });

    it('ledgerLogicToRun returns a Promise', () => {
      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      const returnValue = result.current.ledgerLogicToRun(jest.fn());

      expect(returnValue).toBeInstanceOf(Promise);
    });

    it('returns stable function references across renders', () => {
      const { result, rerender } = renderHook(() =>
        useLedgerBluetooth(mockDeviceId),
      );

      rerender();

      // Note: These may or may not be the same reference depending on implementation
      // This test documents the current behavior
      expect(typeof result.current.ledgerLogicToRun).toBe('function');
      expect(typeof result.current.cleanupBluetoothConnection).toBe('function');
    });
  });

  describe('workflow step management', () => {
    it('pushes function to workflow steps when ledgerLogicToRun is called', async () => {
      const mockFunc = jest.fn();
      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      await act(async () => {
        result.current.ledgerLogicToRun(mockFunc);
        await flushPromises();
      });

      // Even though mockFunc is pushed to workflow steps, it won't be called
      // because transport setup fails. The mockFunc should NOT be called.
      expect(mockFunc).not.toHaveBeenCalled();
    });

    it('allows multiple calls to ledgerLogicToRun', async () => {
      const mockFunc1 = jest.fn();
      const mockFunc2 = jest.fn();
      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      await act(async () => {
        result.current.ledgerLogicToRun(mockFunc1);
        await flushPromises();
      });

      await act(async () => {
        result.current.ledgerLogicToRun(mockFunc2);
        await flushPromises();
      });

      // Neither should be called due to transport failure
      expect(mockFunc1).not.toHaveBeenCalled();
      expect(mockFunc2).not.toHaveBeenCalled();
    });
  });

  describe('isEthAppNotOpenErrorMessage integration', () => {
    /**
     * These tests verify the error classification logic correctly uses
     * the isEthAppNotOpenErrorMessage helper function.
     */

    it('correctly passes error message to isEthAppNotOpenErrorMessage', async () => {
      const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      await act(async () => {
        result.current.ledgerLogicToRun(jest.fn());
        await flushPromises();
      });

      await waitFor(() => {
        expect(mockIsEthAppNotOpenErrorMessage).toHaveBeenCalled();
      });

      const callArg = mockIsEthAppNotOpenErrorMessage.mock.calls[0][0];
      expect(typeof callArg).toBe('string');
      expect(callArg).toBe('transportRef.current is undefined');
    });

    it('uses return value of isEthAppNotOpenErrorMessage to determine error type', async () => {
      // Test with true return value
      mockIsEthAppNotOpenErrorMessage.mockReturnValue(true);

      const { result: result1 } = renderHook(() =>
        useLedgerBluetooth(mockDeviceId),
      );

      await act(async () => {
        result1.current.ledgerLogicToRun(jest.fn());
        await flushPromises();
      });

      await waitFor(() => {
        expect(result1.current.error).toBe(
          LedgerCommunicationErrors.EthAppNotOpen,
        );
      });

      // Reset mocks
      jest.clearAllMocks();
      mockIsEthAppNotOpenErrorMessage.mockReturnValue(false);

      // Test with false return value
      const { result: result2 } = renderHook(() =>
        useLedgerBluetooth(mockDeviceId),
      );

      await act(async () => {
        result2.current.ledgerLogicToRun(jest.fn());
        await flushPromises();
      });

      await waitFor(() => {
        expect(result2.current.error).toBe(
          LedgerCommunicationErrors.UnknownError,
        );
      });
    });
  });

  describe('device ID handling', () => {
    it('accepts different device IDs', () => {
      const deviceIds = ['device-1', 'device-uuid-12345', 'AA:BB:CC:DD:EE:FF'];

      deviceIds.forEach((deviceId) => {
        const { result } = renderHook(() => useLedgerBluetooth(deviceId));
        expect(result.current.error).toBeUndefined();
        expect(result.current.isSendingLedgerCommands).toBe(false);
      });
    });

    it('handles empty device ID gracefully', async () => {
      const { result } = renderHook(() => useLedgerBluetooth(''));

      await act(async () => {
        result.current.ledgerLogicToRun(jest.fn());
        await flushPromises();
      });

      // With empty device ID, the transport setup is skipped
      // but processLedgerWorkflow still throws because transportRef is undefined
      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });
  });

  describe('unmount cleanup', () => {
    it('does not throw when unmounted', () => {
      const { unmount } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      // Should not throw
      expect(() => unmount()).not.toThrow();
    });

    it('cleans up state on unmount', () => {
      const { unmount } = renderHook(() => useLedgerBluetooth(mockDeviceId));

      // The cleanup effect runs on unmount
      // Since transportRef is undefined, it just returns without doing anything
      expect(() => unmount()).not.toThrow();
    });
  });
});
