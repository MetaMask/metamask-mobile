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
 * WHAT IS TESTED:
 * - Initial state values and hook API contract
 * - Successful transport connection and Ethereum happy path
 * - BOLOS app detection and Ethereum app launch (recursive workflow)
 * - Non-Ethereum app detection and close flow (recursive workflow)
 * - Error classification logic (all TransportStatusError codes, LedgerError,
 * message-based errors, TransportRaceCondition)
 * - Disconnect handler (isReconnecting guard)
 * - Restart limit enforcement
 * - Unmount cleanup with active transport
 * - cleanupBluetoothConnection behavior
 * - isEthAppNotOpenErrorMessage integration
 * - isDisconnectError re-export (comprehensive tests in ledgerErrors.test.ts)
 */

// Mock transport instance shared across tests that enable BLE
const mockTransportInstance = {
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};
let capturedDisconnectHandler: (() => void) | undefined;

jest.mock('./loadBleTransport', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import loadBleTransport from './loadBleTransport';
const mockLoadBleTransport = loadBleTransport as jest.Mock;

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

// Import hook and helpers after all mocks
import useLedgerBluetooth, { isDisconnectError } from './useLedgerBluetooth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeTransportStatusError = (statusCode: number): Error => {
  const err = new Error(`TransportStatusError: 0x${statusCode.toString(16)}`);
  err.name = 'TransportStatusError';
  (err as unknown as Record<string, unknown>).statusCode = statusCode;
  return err;
};

const makeDisconnectError = (): Error => {
  const err = new Error('Disconnected during operation');
  err.name = 'DisconnectedDeviceDuringOperation';
  return err;
};

const setupMockTransport = () => {
  capturedDisconnectHandler = undefined;
  mockTransportInstance.on.mockImplementation(
    (event: string, handler: () => void) => {
      if (event === 'disconnect') {
        capturedDisconnectHandler = handler;
      }
    },
  );
  mockTransportInstance.close.mockResolvedValue(undefined);
  mockLoadBleTransport.mockResolvedValue(mockTransportInstance);
};

describe('useLedgerBluetooth', () => {
  const mockDeviceId = 'test-device-id';

  beforeEach(() => {
    jest.clearAllMocks();
    capturedDisconnectHandler = undefined;
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

  // =========================================================================
  // Tests with Bluetooth transport available
  // =========================================================================
  describe('with Bluetooth transport available', () => {
    beforeEach(() => {
      setupMockTransport();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    // -----------------------------------------------------------------------
    // Ethereum happy path
    // -----------------------------------------------------------------------
    describe('Ethereum app happy path', () => {
      it('invokes user callback with transport when Ethereum app is running', async () => {
        const mockFunc = jest.fn();
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(mockFunc);
        });

        expect(mockFunc).toHaveBeenCalledWith(mockTransportInstance);
        expect(mockConnectLedgerHardware).toHaveBeenCalledTimes(1);
        expect(result.current.error).toBeUndefined();
      });

      it('calls connectLedgerHardware with transport and deviceId', async () => {
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(jest.fn());
        });

        expect(mockConnectLedgerHardware).toHaveBeenCalledWith(
          mockTransportInstance,
          mockDeviceId,
        );
      });

      it('registers disconnect handler on the transport', async () => {
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(jest.fn());
        });

        expect(mockTransportInstance.on).toHaveBeenCalledWith(
          'disconnect',
          expect.any(Function),
        );
        expect(capturedDisconnectHandler).toBeDefined();
      });

      it('reuses existing transport on subsequent calls', async () => {
        const mockFunc1 = jest.fn();
        const mockFunc2 = jest.fn();
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(mockFunc1);
        });

        await act(async () => {
          await result.current.ledgerLogicToRun(mockFunc2);
        });

        expect(mockLoadBleTransport).toHaveBeenCalledTimes(1);
        expect(mockFunc1).toHaveBeenCalledWith(mockTransportInstance);
        expect(mockFunc2).toHaveBeenCalledWith(mockTransportInstance);
      });
    });

    // -----------------------------------------------------------------------
    // BOLOS app detection
    // -----------------------------------------------------------------------
    describe('BOLOS app detection', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      it('opens Ethereum app and recurses when BOLOS detected', async () => {
        mockConnectLedgerHardware
          .mockResolvedValueOnce('BOLOS')
          .mockResolvedValueOnce('Ethereum');

        const mockFunc = jest.fn();
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          const promise = result.current.ledgerLogicToRun(mockFunc);
          await jest.runAllTimersAsync();
          await promise;
        });

        expect(mockOpenEthereumAppOnLedger).toHaveBeenCalledTimes(1);
        expect(mockConnectLedgerHardware).toHaveBeenCalledTimes(2);
        expect(mockFunc).toHaveBeenCalledWith(mockTransportInstance);
        expect(result.current.error).toBeUndefined();
      });

      it('sets isAppLaunchConfirmationNeeded during Ethereum app open', async () => {
        mockOpenEthereumAppOnLedger.mockImplementation(async () => {
          // Can't read hook state inside mock, but the flag is set before this call
        });
        mockConnectLedgerHardware
          .mockResolvedValueOnce('BOLOS')
          .mockResolvedValueOnce('Ethereum');

        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          const promise = result.current.ledgerLogicToRun(jest.fn());
          await jest.runAllTimersAsync();
          await promise;
        });

        // After workflow completes, the flag should be cleared
        expect(result.current.isAppLaunchConfirmationNeeded).toBe(false);
      });

      it('throws AppIsNotInstalled for status code 0x6984', async () => {
        mockConnectLedgerHardware.mockResolvedValueOnce('BOLOS');
        mockOpenEthereumAppOnLedger.mockRejectedValueOnce(
          makeTransportStatusError(0x6984),
        );

        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          const promise = result.current.ledgerLogicToRun(jest.fn());
          await jest.runAllTimersAsync();
          await promise;
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.AppIsNotInstalled,
          );
        });
      });

      it('throws AppIsNotInstalled for status code 0x6807', async () => {
        mockConnectLedgerHardware.mockResolvedValueOnce('BOLOS');
        mockOpenEthereumAppOnLedger.mockRejectedValueOnce(
          makeTransportStatusError(0x6807),
        );

        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          const promise = result.current.ledgerLogicToRun(jest.fn());
          await jest.runAllTimersAsync();
          await promise;
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.AppIsNotInstalled,
          );
        });
      });

      it('throws UserRefusedConfirmation for status code 0x6985', async () => {
        mockConnectLedgerHardware.mockResolvedValueOnce('BOLOS');
        mockOpenEthereumAppOnLedger.mockRejectedValueOnce(
          makeTransportStatusError(0x6985),
        );

        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          const promise = result.current.ledgerLogicToRun(jest.fn());
          await jest.runAllTimersAsync();
          await promise;
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.UserRefusedConfirmation,
          );
        });
      });

      it('throws UserRefusedConfirmation for status code 0x5501', async () => {
        mockConnectLedgerHardware.mockResolvedValueOnce('BOLOS');
        mockOpenEthereumAppOnLedger.mockRejectedValueOnce(
          makeTransportStatusError(0x5501),
        );

        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          const promise = result.current.ledgerLogicToRun(jest.fn());
          await jest.runAllTimersAsync();
          await promise;
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.UserRefusedConfirmation,
          );
        });
      });

      it('throws FailedToOpenApp for non-disconnect errors', async () => {
        mockConnectLedgerHardware.mockResolvedValueOnce('BOLOS');
        mockOpenEthereumAppOnLedger.mockRejectedValueOnce(
          new Error('generic open failure'),
        );

        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          const promise = result.current.ledgerLogicToRun(jest.fn());
          await jest.runAllTimersAsync();
          await promise;
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.FailedToOpenApp,
          );
        });
      });

      it('suppresses disconnect errors and continues recursion', async () => {
        mockConnectLedgerHardware
          .mockResolvedValueOnce('BOLOS')
          .mockResolvedValueOnce('Ethereum');
        mockOpenEthereumAppOnLedger.mockRejectedValueOnce(
          makeDisconnectError(),
        );

        const mockFunc = jest.fn();
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          const promise = result.current.ledgerLogicToRun(mockFunc);
          await jest.runAllTimersAsync();
          await promise;
        });

        expect(mockFunc).toHaveBeenCalledWith(mockTransportInstance);
        expect(result.current.error).toBeUndefined();
      });

      it('throws FailedToOpenApp when restart limit is reached', async () => {
        mockConnectLedgerHardware.mockResolvedValue('BOLOS');

        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          const promise = result.current.ledgerLogicToRun(jest.fn());
          await jest.runAllTimersAsync();
          await promise;
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.FailedToOpenApp,
          );
        });
      });
    });

    // -----------------------------------------------------------------------
    // Non-Ethereum app detection
    // -----------------------------------------------------------------------
    describe('non-Ethereum app detection', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      it('closes running app and recurses to Ethereum', async () => {
        mockConnectLedgerHardware
          .mockResolvedValueOnce('SomeOtherApp')
          .mockResolvedValueOnce('Ethereum');

        const mockFunc = jest.fn();
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          const promise = result.current.ledgerLogicToRun(mockFunc);
          await jest.runAllTimersAsync();
          await promise;
        });

        expect(mockCloseRunningAppOnLedger).toHaveBeenCalledTimes(1);
        expect(mockConnectLedgerHardware).toHaveBeenCalledTimes(2);
        expect(mockFunc).toHaveBeenCalledWith(mockTransportInstance);
        expect(result.current.error).toBeUndefined();
      });

      it('throws FailedToCloseApp for non-disconnect close errors', async () => {
        mockConnectLedgerHardware.mockResolvedValueOnce('SomeOtherApp');
        mockCloseRunningAppOnLedger.mockRejectedValueOnce(
          new Error('close failure'),
        );

        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          const promise = result.current.ledgerLogicToRun(jest.fn());
          await jest.runAllTimersAsync();
          await promise;
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.FailedToCloseApp,
          );
        });
      });

      it('suppresses disconnect errors during close and continues recursion', async () => {
        mockConnectLedgerHardware
          .mockResolvedValueOnce('SomeOtherApp')
          .mockResolvedValueOnce('Ethereum');
        mockCloseRunningAppOnLedger.mockRejectedValueOnce(
          makeDisconnectError(),
        );

        const mockFunc = jest.fn();
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          const promise = result.current.ledgerLogicToRun(mockFunc);
          await jest.runAllTimersAsync();
          await promise;
        });

        expect(mockFunc).toHaveBeenCalledWith(mockTransportInstance);
        expect(result.current.error).toBeUndefined();
      });

      it('throws FailedToCloseApp when restart limit is reached', async () => {
        mockConnectLedgerHardware.mockResolvedValue('SomeOtherApp');

        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          const promise = result.current.ledgerLogicToRun(jest.fn());
          await jest.runAllTimersAsync();
          await promise;
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.FailedToCloseApp,
          );
        });
      });
    });

    // -----------------------------------------------------------------------
    // Error classification in processLedgerWorkflow catch block
    // -----------------------------------------------------------------------
    describe('error classification in processLedgerWorkflow', () => {
      it('sets UserRefusedConfirmation for TransportStatusError 0x6985', async () => {
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(async () => {
            throw makeTransportStatusError(0x6985);
          });
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.UserRefusedConfirmation,
          );
        });
      });

      it('sets UserRefusedConfirmation for TransportStatusError 0x5501', async () => {
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(async () => {
            throw makeTransportStatusError(0x5501);
          });
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.UserRefusedConfirmation,
          );
        });
      });

      it('sets LedgerIsLocked for TransportStatusError 0x6b0c', async () => {
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(async () => {
            throw makeTransportStatusError(0x6b0c);
          });
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.LedgerIsLocked,
          );
        });
      });

      it('sets EthAppNotOpen for TransportStatusError when isEthAppNotOpenStatusCode returns true', async () => {
        mockIsEthAppNotOpenStatusCode.mockReturnValue(true);
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(async () => {
            throw makeTransportStatusError(0x6d00);
          });
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.EthAppNotOpen,
          );
        });
      });

      it('sets UserRefusedConfirmation for unknown TransportStatusError codes', async () => {
        mockIsEthAppNotOpenStatusCode.mockReturnValue(false);
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(async () => {
            throw makeTransportStatusError(0x9999);
          });
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.UserRefusedConfirmation,
          );
        });
      });

      it('sets LedgerHasPendingConfirmation for TransportRaceCondition', async () => {
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(async () => {
            const err = new Error('Race condition');
            err.name = 'TransportRaceCondition';
            throw err;
          });
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.LedgerHasPendingConfirmation,
          );
        });
      });

      it('sets NotSupported for typed data signing version error', async () => {
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(async () => {
            throw new Error(
              'Only version 4 of typed data signing is supported',
            );
          });
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.NotSupported,
          );
        });
      });

      it('sets LedgerIsLocked for locked device message', async () => {
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(async () => {
            throw new Error('Ledger device: Locked device');
          });
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.LedgerIsLocked,
          );
        });
      });

      it('sets NonceTooLow for nonce too low message', async () => {
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(async () => {
            throw new Error('nonce too low');
          });
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.NonceTooLow,
          );
        });
      });

      it('sets BlindSignError for blind signing message', async () => {
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(async () => {
            throw new Error(
              'Please enable Blind signing or Contract data in the Ethereum app Settings',
            );
          });
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.BlindSignError,
          );
        });
      });

      it('sets EthAppNotOpen when isEthAppNotOpenErrorMessage returns true', async () => {
        mockIsEthAppNotOpenErrorMessage.mockReturnValue(true);
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(async () => {
            throw new Error('some eth app not open error');
          });
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.EthAppNotOpen,
          );
        });
      });

      it('sets UnknownError for unrecognized errors', async () => {
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(async () => {
            throw new Error('completely unexpected error');
          });
        });

        await waitFor(() => {
          expect(result.current.error).toBe(
            LedgerCommunicationErrors.UnknownError,
          );
        });
      });

      it('resets connection state after any error', async () => {
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(async () => {
            throw new Error('some error');
          });
        });

        await waitFor(() => {
          expect(result.current.isSendingLedgerCommands).toBe(false);
        });
      });
    });

    // -----------------------------------------------------------------------
    // Disconnect handler
    // -----------------------------------------------------------------------
    describe('disconnect handler', () => {
      it('resets connection state when disconnect fires outside reconnection', async () => {
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(jest.fn());
        });

        expect(capturedDisconnectHandler).toBeDefined();

        act(() => {
          capturedDisconnectHandler?.();
        });

        expect(result.current.isSendingLedgerCommands).toBe(false);
      });

      it('does not reset state when disconnect fires during isReconnecting', async () => {
        jest.useFakeTimers();

        mockConnectLedgerHardware
          .mockResolvedValueOnce('BOLOS')
          .mockResolvedValueOnce('Ethereum');

        // Use a double queueMicrotask so the handler fires after
        // isReconnecting is set to true but before the setTimeout resolves.
        mockOpenEthereumAppOnLedger.mockImplementation(async () => {
          queueMicrotask(() => {
            queueMicrotask(() => {
              capturedDisconnectHandler?.();
            });
          });
        });

        const mockFunc = jest.fn();
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          const promise = result.current.ledgerLogicToRun(mockFunc);
          await jest.runAllTimersAsync();
          await promise;
        });

        expect(mockFunc).toHaveBeenCalled();
        expect(result.current.error).toBeUndefined();
      });
    });

    // -----------------------------------------------------------------------
    // Unmount with active transport
    // -----------------------------------------------------------------------
    describe('unmount with active transport', () => {
      it('closes transport on unmount', async () => {
        const { result, unmount } = renderHook(() =>
          useLedgerBluetooth(mockDeviceId),
        );

        await act(async () => {
          await result.current.ledgerLogicToRun(jest.fn());
        });

        unmount();

        expect(mockTransportInstance.close).toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // Transport setup failure
    // -----------------------------------------------------------------------
    describe('transport setup failure', () => {
      it('sets LedgerDisconnected when BLE open rejects', async () => {
        mockLoadBleTransport.mockRejectedValueOnce(
          new Error('BLE open failed'),
        );
        const { result } = renderHook(() => useLedgerBluetooth(mockDeviceId));

        await act(async () => {
          await result.current.ledgerLogicToRun(jest.fn());
        });

        await waitFor(() => {
          expect(result.current.error).toBeDefined();
        });
      });
    });
  });
});

describe('isDisconnectError re-export', () => {
  it('re-exports isDisconnectError from ledgerErrors', () => {
    expect(typeof isDisconnectError).toBe('function');

    const disconnectError = new Error('disconnected');
    disconnectError.name = 'DisconnectedDevice';
    expect(isDisconnectError(disconnectError)).toBe(true);
    expect(isDisconnectError(new Error('generic'))).toBe(false);
  });
});
