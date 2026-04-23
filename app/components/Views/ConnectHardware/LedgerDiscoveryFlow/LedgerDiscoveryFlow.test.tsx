import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import LedgerDiscoveryFlow from './LedgerDiscoveryFlow';
import type { DiscoveredDevice } from '../../../../core/HardwareWallet/types';

// ─── Navigation ────────────────────────────────────────────────────────────────

const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    setOptions: mockSetOptions,
  }),
}));

// ─── Bluetooth permissions ──────────────────────────────────────────────────────

let mockHasPermissions = true;

jest.mock('../../../hooks/useBluetoothPermissions', () => ({
  __esModule: true,
  default: () => ({ hasBluetoothPermissions: mockHasPermissions }),
}));

// ─── LedgerBluetoothAdapter mock ───────────────────────────────────────────────

type TransportCallback = (isAvailable: boolean) => void;
type DeviceFoundCallback = (device: DiscoveredDevice) => void;
type ErrorCallback = (error: Error) => void;

let capturedTransportCallback: TransportCallback | null = null;
let capturedDeviceFoundCallback: DeviceFoundCallback | null = null;
let capturedErrorCallback: ErrorCallback | null = null;

const mockDestroy = jest.fn();
const mockStartDeviceDiscovery = jest.fn(
  (onDeviceFound: DeviceFoundCallback, onError: ErrorCallback) => {
    capturedDeviceFoundCallback = onDeviceFound;
    capturedErrorCallback = onError;
    return jest.fn(); // cleanup fn
  },
);
const mockIsTransportAvailable = jest.fn().mockResolvedValue(true);
const mockOnTransportStateChange = jest.fn((callback: TransportCallback) => {
  capturedTransportCallback = callback;
  return jest.fn(); // unsubscribe fn
});

jest.mock(
  '../../../../core/HardwareWallet/adapters/LedgerBluetoothAdapter',
  () => ({
    LedgerBluetoothAdapter: jest.fn().mockImplementation(() => ({
      destroy: mockDestroy,
      startDeviceDiscovery: mockStartDeviceDiscovery,
      isTransportAvailable: mockIsTransportAvailable,
      onTransportStateChange: mockOnTransportStateChange,
    })),
  }),
);

jest.mock('rive-react-native', () => ({
  __esModule: true,
  default: () => null,
  Fit: { Contain: 1 },
  Alignment: { Center: 1 },
  AutoBind: () => () => null,
  useRive: () => [jest.fn(), null],
  RiveRef: jest.fn(),
}));

// ─── Child component stubs ──────────────────────────────────────────────────────

jest.mock('./LedgerDiscoveryAccountSelection', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return ({ selectedDevice }: { selectedDevice: { name: string } }) =>
    ReactActual.createElement(
      Text,
      { testID: 'ledger-discovery-account-selection' },
      `Account selection for ${selectedDevice.name}`,
    );
});

// ─── Helpers ────────────────────────────────────────────────────────────────────

const initialState = { user: { appTheme: 'dark' } };

const renderFlow = () =>
  renderWithProvider(<LedgerDiscoveryFlow />, { state: initialState });

const simulateBluetoothOn = async () => {
  act(() => {
    capturedTransportCallback?.(true);
  });
  // Flush the isTransportAvailable() promise inside the scan effect
  await act(async () => {});
};

const simulateDeviceFound = (device: DiscoveredDevice) => {
  act(() => {
    capturedDeviceFoundCallback?.(device);
  });
};

const simulateScanError = (error: Error) => {
  act(() => {
    capturedErrorCallback?.(error);
  });
};

const NANO_X: DiscoveredDevice = {
  id: 'nano-x',
  name: 'Nano X',
  serviceUUIDs: ['13d63400-2c97-0004-0000-4c6564676572'],
};

const FLEX: DiscoveredDevice = {
  id: 'flex',
  name: 'Flex',
  serviceUUIDs: ['13d63400-2c97-6004-0000-4c6564676572'],
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('LedgerDiscoveryFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockHasPermissions = true;
    capturedTransportCallback = null;
    capturedDeviceFoundCallback = null;
    capturedErrorCallback = null;
    mockIsTransportAvailable.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('searching state', () => {
    it('renders the searching view on mount', () => {
      renderFlow();

      expect(
        screen.getByTestId('hardware-wallet-searching-content'),
      ).toBeOnTheScreen();
    });

    it('shows bluetooth-off screen when bluetooth is off', () => {
      renderFlow();

      act(() => {
        capturedTransportCallback?.(false);
      });

      expect(screen.getByText('Bluetooth is turned off')).toBeOnTheScreen();
    });

    it('does not start scanning until bluetooth is on', async () => {
      renderFlow();
      expect(mockStartDeviceDiscovery).not.toHaveBeenCalled();

      await simulateBluetoothOn();

      expect(mockStartDeviceDiscovery).toHaveBeenCalledTimes(1);
    });
  });

  describe('device found', () => {
    it('transitions to found view when a device is discovered', async () => {
      renderFlow();
      await simulateBluetoothOn();
      simulateDeviceFound(NANO_X);

      expect(screen.getByText('Ledger device found')).toBeOnTheScreen();
      expect(screen.getByText('Nano X')).toBeOnTheScreen();
    });

    it('shows connect button in found view', async () => {
      renderFlow();
      await simulateBluetoothOn();
      simulateDeviceFound(NANO_X);

      expect(
        screen.getByTestId('ledger-discovery-connect-button'),
      ).toBeOnTheScreen();
    });

    it('pressing connect moves to account selection', async () => {
      renderFlow();
      await simulateBluetoothOn();
      simulateDeviceFound(NANO_X);

      fireEvent.press(screen.getByTestId('ledger-discovery-connect-button'));

      expect(
        screen.getByTestId('ledger-discovery-account-selection'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('ledger-discovery-account-selection'),
      ).toHaveTextContent('Account selection for Nano X');
    });
  });

  describe('not found', () => {
    it('shows not-found view after timeout', async () => {
      renderFlow();
      await simulateBluetoothOn();

      act(() => {
        jest.advanceTimersByTime(15000);
      });

      expect(screen.getByText('Device not found')).toBeOnTheScreen();
    });

    it('shows bluetooth-connection-failed screen immediately on scan error', async () => {
      renderFlow();
      await simulateBluetoothOn();
      simulateScanError(new Error('BLE scan failed'));

      expect(screen.getByText('Bluetooth connection failed')).toBeOnTheScreen();
    });

    it('shows a Try Again button on the not-found screen', async () => {
      renderFlow();
      await simulateBluetoothOn();

      act(() => {
        jest.advanceTimersByTime(15000);
      });

      expect(
        screen.getByTestId('ledger-discovery-retry-button'),
      ).toBeOnTheScreen();
    });

    it('pressing Try Again resets to searching state', async () => {
      renderFlow();
      await simulateBluetoothOn();

      act(() => {
        jest.advanceTimersByTime(15000);
      });

      expect(screen.getByText('Device not found')).toBeOnTheScreen();

      fireEvent.press(screen.getByTestId('ledger-discovery-retry-button'));

      expect(
        screen.getByTestId('hardware-wallet-searching-content'),
      ).toBeOnTheScreen();
    });
  });

  describe('select device sheet', () => {
    it('opens select device sheet when device chip is pressed', async () => {
      renderFlow();
      await simulateBluetoothOn();
      simulateDeviceFound(NANO_X);

      fireEvent.press(screen.getByTestId('ledger-discovery-device-chip'));

      expect(
        screen.getByTestId('ledger-discovery-select-device-sheet'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Select device')).toBeOnTheScreen();
    });

    it('saves selected device and moves to account selection', async () => {
      renderFlow();
      await simulateBluetoothOn();
      simulateDeviceFound(NANO_X);
      simulateDeviceFound(FLEX);

      fireEvent.press(screen.getByTestId('ledger-discovery-device-chip'));
      fireEvent.press(
        screen.getByTestId('ledger-discovery-device-option-flex'),
      );
      fireEvent.press(screen.getByTestId('ledger-discovery-save-button'));

      expect(
        screen.getByTestId('ledger-discovery-account-selection'),
      ).toHaveTextContent('Account selection for Flex');
    });

    it('closes select device sheet without changing device on close', async () => {
      renderFlow();
      await simulateBluetoothOn();
      simulateDeviceFound(NANO_X);
      simulateDeviceFound(FLEX);

      fireEvent.press(screen.getByTestId('ledger-discovery-device-chip'));
      fireEvent.press(screen.getByTestId('ledger-discovery-close-sheet'));

      expect(
        screen.queryByTestId('ledger-discovery-select-device-sheet'),
      ).not.toBeOnTheScreen();
      // Still on found view with original device
      expect(screen.getByText('Nano X')).toBeOnTheScreen();
    });
  });

  describe('permissions', () => {
    it('does not create adapter when bluetooth permissions are not granted', () => {
      mockHasPermissions = false;
      const { LedgerBluetoothAdapter } = jest.requireMock(
        '../../../../core/HardwareWallet/adapters/LedgerBluetoothAdapter',
      );

      renderFlow();

      expect(LedgerBluetoothAdapter).not.toHaveBeenCalled();
    });
  });
});
