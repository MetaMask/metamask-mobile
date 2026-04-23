import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import DiscoveryFlow from './DiscoveryFlow';
import type { DiscoveredDevice } from '../../../../core/HardwareWallet/types';

const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    setOptions: mockSetOptions,
  }),
  useRoute: () => ({
    params: { walletType: 'ledger' },
  }),
}));

let mockHasPermissions = true;

jest.mock('../../../hooks/useBluetoothPermissions', () => ({
  __esModule: true,
  default: () => ({
    hasBluetoothPermissions: mockHasPermissions,
    bluetoothPermissionError: null,
  }),
}));

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
    return jest.fn();
  },
);
const mockIsTransportAvailable = jest.fn().mockResolvedValue(true);
const mockOnTransportStateChange = jest.fn((callback: TransportCallback) => {
  capturedTransportCallback = callback;
  return jest.fn();
});

jest.mock(
  '../../../../core/HardwareWallet/adapters/factory',
  () => ({
    createAdapter: jest.fn().mockImplementation(() => ({
      destroy: mockDestroy,
      startDeviceDiscovery: mockStartDeviceDiscovery,
      isTransportAvailable: mockIsTransportAvailable,
      onTransportStateChange: mockOnTransportStateChange,
      walletType: 'ledger',
      requiresDeviceDiscovery: true,
    })),
  }),
);

jest.mock('./configs', () => ({
  getConfigForWalletType: jest.fn().mockReturnValue({
    walletType: 'ledger',
    discoveryTimeoutMs: 15000,
    animationSource: 0,
    artboardName: 'Ledger',
    stateMachineName: 'Ledger_states',
    deviceIcon: 'smartphone',
    troubleshootingItems: [
      { id: 'lock', icon: 'LockSlash', label: 'Unlock device' },
      { id: 'bt', icon: 'Connect', label: 'Enable Bluetooth' },
    ],
    errorToStepMap: {},
    accountManager: {
      getAccounts: jest.fn().mockResolvedValue([]),
      unlockAccounts: jest.fn(),
      forgetDevice: jest.fn(),
    },
    strings: {
      deviceFound: 'Device found',
      connectButton: 'Connect',
      deviceNotFound: 'Device not found',
      tryAgain: 'Try again',
      selectAccounts: 'Select accounts',
    },
  }),
}));

jest.mock('./screens/DiscoveryFound', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return ({ deviceName }: { deviceName: string }) =>
    ReactActual.createElement(
      Text,
      { testID: 'discovery-found' },
      `Found: ${deviceName}`,
    );
});

jest.mock('./screens/DiscoverySelectDevice', () => () => null);

jest.mock('./screens/DiscoveryAccountSelection', () => () => null);

const NANO_X: DiscoveredDevice = { id: 'nano-x', name: 'Nano X' };

const initialState = { user: { appTheme: 'dark' } };

const renderFlow = () =>
  renderWithProvider(<DiscoveryFlow />, { state: initialState });

const simulateBluetoothOn = async () => {
  act(() => {
    capturedTransportCallback?.(true);
  });
  // eslint-disable-next-line no-empty-function
  await act(async () => {});
};

const simulateDeviceFound = (foundDevice: DiscoveredDevice) => {
  act(() => {
    capturedDeviceFoundCallback?.(foundDevice);
  });
};

describe('DiscoveryFlow orchestrator', () => {
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

  it('renders searching view on mount', () => {
    renderFlow();
    expect(
      screen.getByTestId('hardware-wallet-searching-content'),
    ).toBeOnTheScreen();
  });

  it('transitions to found view when device is discovered', async () => {
    renderFlow();
    await simulateBluetoothOn();
    simulateDeviceFound(NANO_X);

    expect(screen.getByText('Found: Nano X')).toBeOnTheScreen();
  });

  it('shows not-found after timeout', async () => {
    renderFlow();
    await simulateBluetoothOn();

    act(() => {
      jest.advanceTimersByTime(15000);
    });

    expect(screen.getByText('Device not found')).toBeOnTheScreen();
  });

  it('retries back to searching from not-found', async () => {
    renderFlow();
    await simulateBluetoothOn();

    act(() => {
      jest.advanceTimersByTime(15000);
    });

    expect(screen.getByText('Device not found')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('discovery-retry-button'));

    expect(
      screen.getByTestId('hardware-wallet-searching-content'),
    ).toBeOnTheScreen();
  });
});
