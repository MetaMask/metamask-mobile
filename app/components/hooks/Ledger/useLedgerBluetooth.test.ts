import { renderHook, act } from '@testing-library/react-hooks';
import useLedgerBluetooth from './useLedgerBluetooth';
import { LedgerCommunicationErrors } from '../../../core/Ledger/ledgerErrors';
import {
  connectLedgerHardware,
  openEthereumAppOnLedger,
  closeRunningAppOnLedger,
} from '../../../core/Ledger/Ledger';

// Mock the Ledger functions
jest.mock('../../../core/Ledger/Ledger', () => ({
  connectLedgerHardware: jest.fn(),
  openEthereumAppOnLedger: jest.fn(),
  closeRunningAppOnLedger: jest.fn(),
}));

// Mock the Bluetooth transport
const mockTransportClose = jest.fn();
const mockTransportOn = jest.fn();
let mockTransportOpen: jest.Mock;

jest.mock('@ledgerhq/react-native-hw-transport-ble', () => ({
  __esModule: true,
  default: {
    open: jest.fn().mockImplementation(() =>
      Promise.resolve({
        close: mockTransportClose,
        on: mockTransportOn,
      }),
    ),
  },
}));

const MockConnectLedgerHardware = jest.mocked(connectLedgerHardware);
const MockOpenEthereumAppOnLedger = jest.mocked(openEthereumAppOnLedger);
const MockCloseRunningAppOnLedger = jest.mocked(closeRunningAppOnLedger);

describe('useLedgerBluetooth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockConnectLedgerHardware.mockResolvedValue('Ethereum');
    MockOpenEthereumAppOnLedger.mockResolvedValue(undefined);
    MockCloseRunningAppOnLedger.mockResolvedValue(undefined);

    // Reset the transport mock
    mockTransportOpen = jest.fn().mockResolvedValue({
      close: mockTransportClose,
      on: mockTransportOn,
    });
    jest.mock('@ledgerhq/react-native-hw-transport-ble', () => ({
      __esModule: true,
      default: {
        open: mockTransportOpen,
      },
    }));
  });

  describe('Initial State', () => {
    it('returns initial state with no device id', () => {
      const { result } = renderHook(() => useLedgerBluetooth(''));

      expect(result.current.isSendingLedgerCommands).toBe(false);
      expect(result.current.isAppLaunchConfirmationNeeded).toBe(false);
      expect(result.current.error).toBeUndefined();
      expect(typeof result.current.ledgerLogicToRun).toBe('function');
      expect(typeof result.current.cleanupBluetoothConnection).toBe('function');
    });

    it('returns initial state with device id', () => {
      const { result } = renderHook(() => useLedgerBluetooth('test-device-id'));

      expect(result.current.isSendingLedgerCommands).toBe(false);
      expect(result.current.isAppLaunchConfirmationNeeded).toBe(false);
      expect(result.current.error).toBeUndefined();
    });
  });

  describe('EthAppNotOpen Error Handling - TransportStatusError', () => {
    const ethAppNotOpenStatusCodes = [
      { code: 0x6d00, description: 'CLA_NOT_SUPPORTED - wrong app class' },
      {
        code: 0x6e00,
        description: 'INS_NOT_SUPPORTED - instruction not supported',
      },
      { code: 0x6e01, description: 'INS_NOT_SUPPORTED variant' },
      { code: 0x6511, description: 'APP_NOT_OPEN - app is not open' },
      {
        code: 0x6700,
        description: 'INCORRECT_LENGTH - can occur when wrong app is open',
      },
      {
        code: 0x650f,
        description: 'UNKNOWN_ERROR - often indicates app not ready/open',
      },
    ];

    ethAppNotOpenStatusCodes.forEach(({ code, description }) => {
      it(`sets EthAppNotOpen error when TransportStatusError with ${code.toString(16)} (${description})`, async () => {
        const transportError = new Error('TransportStatusError');
        transportError.name = 'TransportStatusError';
        // @ts-expect-error statusCode is a custom property on TransportStatusError
        transportError.statusCode = code;

        MockConnectLedgerHardware.mockRejectedValueOnce(transportError);

        const { result } = renderHook(() =>
          useLedgerBluetooth('test-device-id'),
        );

        await act(async () => {
          await result.current.ledgerLogicToRun(async () => {
            // Mock ledger logic
          });
        });

        // Wait for the error to be set
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        });

        expect(result.current.error).toBe(
          LedgerCommunicationErrors.EthAppNotOpen,
        );
      });
    });
  });

  describe('EthAppNotOpen Error Handling - Error Message Patterns', () => {
    const errorMessagePatterns = [
      { code: '0x650f', message: 'Ledger device: UNKNOWN_ERROR (0x650f)' },
      { code: '0x6511', message: 'Error with code 0x6511' },
      { code: '0x6d00', message: 'Failed with status 0x6d00' },
      { code: '0x6e00', message: 'Transport error 0x6e00' },
    ];

    errorMessagePatterns.forEach(({ code, message }) => {
      it(`sets EthAppNotOpen error when error message contains ${code}`, async () => {
        const error = new Error(message);
        MockConnectLedgerHardware.mockRejectedValueOnce(error);

        const { result } = renderHook(() =>
          useLedgerBluetooth('test-device-id'),
        );

        await act(async () => {
          await result.current.ledgerLogicToRun(async () => {
            // Mock ledger logic
          });
        });

        // Wait for the error to be set
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        });

        expect(result.current.error).toBe(
          LedgerCommunicationErrors.EthAppNotOpen,
        );
      });
    });
  });

  describe('Other Error Handling', () => {
    it('sets LedgerIsLocked error when status code is 0x6b0c', async () => {
      const transportError = new Error('TransportStatusError');
      transportError.name = 'TransportStatusError';
      // @ts-expect-error statusCode is a custom property on TransportStatusError
      transportError.statusCode = 0x6b0c;

      MockConnectLedgerHardware.mockRejectedValueOnce(transportError);

      const { result } = renderHook(() => useLedgerBluetooth('test-device-id'));

      await act(async () => {
        await result.current.ledgerLogicToRun(async () => {
          // Mock ledger logic
        });
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe(
        LedgerCommunicationErrors.LedgerIsLocked,
      );
    });

    it('sets UserRefusedConfirmation error when status code is 0x6985', async () => {
      const transportError = new Error('TransportStatusError');
      transportError.name = 'TransportStatusError';
      // @ts-expect-error statusCode is a custom property on TransportStatusError
      transportError.statusCode = 0x6985;

      MockConnectLedgerHardware.mockRejectedValueOnce(transportError);

      const { result } = renderHook(() => useLedgerBluetooth('test-device-id'));

      await act(async () => {
        await result.current.ledgerLogicToRun(async () => {
          // Mock ledger logic
        });
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe(
        LedgerCommunicationErrors.UserRefusedConfirmation,
      );
    });

    it('sets UserRefusedConfirmation error when status code is 0x5501', async () => {
      const transportError = new Error('TransportStatusError');
      transportError.name = 'TransportStatusError';
      // @ts-expect-error statusCode is a custom property on TransportStatusError
      transportError.statusCode = 0x5501;

      MockConnectLedgerHardware.mockRejectedValueOnce(transportError);

      const { result } = renderHook(() => useLedgerBluetooth('test-device-id'));

      await act(async () => {
        await result.current.ledgerLogicToRun(async () => {
          // Mock ledger logic
        });
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe(
        LedgerCommunicationErrors.UserRefusedConfirmation,
      );
    });

    it('sets LedgerHasPendingConfirmation error for TransportRaceCondition', async () => {
      const error = new Error('TransportRaceCondition');
      error.name = 'TransportRaceCondition';

      MockConnectLedgerHardware.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLedgerBluetooth('test-device-id'));

      await act(async () => {
        await result.current.ledgerLogicToRun(async () => {
          // Mock ledger logic
        });
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe(
        LedgerCommunicationErrors.LedgerHasPendingConfirmation,
      );
    });

    it('sets LedgerIsLocked error when message indicates locked device', async () => {
      const error = new Error('Ledger device: Locked device');

      MockConnectLedgerHardware.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLedgerBluetooth('test-device-id'));

      await act(async () => {
        await result.current.ledgerLogicToRun(async () => {
          // Mock ledger logic
        });
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe(
        LedgerCommunicationErrors.LedgerIsLocked,
      );
    });

    it('sets NonceTooLow error when message indicates nonce too low', async () => {
      const error = new Error('nonce too low');

      MockConnectLedgerHardware.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLedgerBluetooth('test-device-id'));

      await act(async () => {
        await result.current.ledgerLogicToRun(async () => {
          // Mock ledger logic
        });
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe(LedgerCommunicationErrors.NonceTooLow);
    });

    it('sets BlindSignError when message indicates blind signing required', async () => {
      const error = new Error(
        'Please enable Blind signing or Contract data in the Ethereum app Settings',
      );

      MockConnectLedgerHardware.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLedgerBluetooth('test-device-id'));

      await act(async () => {
        await result.current.ledgerLogicToRun(async () => {
          // Mock ledger logic
        });
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe(
        LedgerCommunicationErrors.BlindSignError,
      );
    });

    it('sets NotSupported error for unsupported typed data version', async () => {
      const error = new Error(
        'Only version 4 of typed data signing is supported',
      );

      MockConnectLedgerHardware.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLedgerBluetooth('test-device-id'));

      await act(async () => {
        await result.current.ledgerLogicToRun(async () => {
          // Mock ledger logic
        });
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe(LedgerCommunicationErrors.NotSupported);
    });

    it('sets UnknownError for unhandled errors', async () => {
      const error = new Error('Some unknown error');

      MockConnectLedgerHardware.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLedgerBluetooth('test-device-id'));

      await act(async () => {
        await result.current.ledgerLogicToRun(async () => {
          // Mock ledger logic
        });
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe(LedgerCommunicationErrors.UnknownError);
    });
  });

  describe('cleanupBluetoothConnection', () => {
    it('resets connection state when called', async () => {
      const { result } = renderHook(() => useLedgerBluetooth('test-device-id'));

      // Call cleanup
      act(() => {
        result.current.cleanupBluetoothConnection();
      });

      expect(result.current.isSendingLedgerCommands).toBe(false);
    });
  });
});
