import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import LedgerDiscoveryFlow from './LedgerDiscoveryFlow';

const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
let mockBluetoothPermissions = { hasBluetoothPermissions: true };
let mockBluetoothState = { bluetoothOn: true, bluetoothConnectionError: false };
let mockBluetoothDevices = { devices: [], deviceScanError: false };

const initialState = {
  user: {
    appTheme: 'dark',
  },
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    setOptions: mockSetOptions,
  }),
}));

jest.mock(
  '../../../hooks/useBluetoothPermissions',
  () => () => mockBluetoothPermissions,
);
jest.mock('../../../hooks/Ledger/useBluetooth', () => () => mockBluetoothState);
jest.mock(
  '../../../hooks/Ledger/useBluetoothDevices',
  () => () => mockBluetoothDevices,
);
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

describe('LedgerDiscoveryFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockBluetoothPermissions = { hasBluetoothPermissions: true };
    mockBluetoothState = { bluetoothOn: true, bluetoothConnectionError: false };
    mockBluetoothDevices = { devices: [], deviceScanError: false };
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the found view when a device is discovered', () => {
    const devices = [
      {
        id: 'nano-x',
        name: 'Nano X',
        serviceUUIDs: ['13d63400-2c97-0004-0000-4c6564676572'],
      },
    ];
    mockBluetoothDevices = { devices, deviceScanError: false };

    renderWithProvider(<LedgerDiscoveryFlow />, { state: initialState });

    expect(screen.getByText('Ledger device found')).toBeOnTheScreen();
    expect(screen.getByText('Nano X')).toBeOnTheScreen();
  });

  it('renders not found after timeout', () => {
    renderWithProvider(<LedgerDiscoveryFlow />, { state: initialState });

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(screen.getByText('Device not found')).toBeOnTheScreen();
  });

  it('opens device selection from the found view', () => {
    mockBluetoothDevices = {
      devices: [
        {
          id: 'nano-x',
          name: 'Nano X',
          serviceUUIDs: ['13d63400-2c97-0004-0000-4c6564676572'],
        },
      ],
      deviceScanError: false,
    };

    renderWithProvider(<LedgerDiscoveryFlow />, { state: initialState });
    fireEvent.press(screen.getByTestId('ledger-discovery-device-chip'));

    expect(
      screen.getByTestId('ledger-discovery-select-device-sheet'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Select device')).toBeOnTheScreen();
  });

  it('saves the selected device and moves to account selection', () => {
    mockBluetoothDevices = {
      devices: [
        {
          id: 'nano-x',
          name: 'Nano X',
          serviceUUIDs: ['13d63400-2c97-0004-0000-4c6564676572'],
        },
        {
          id: 'flex',
          name: 'Flex',
          serviceUUIDs: ['13d63400-2c97-6004-0000-4c6564676572'],
        },
      ],
      deviceScanError: false,
    };

    renderWithProvider(<LedgerDiscoveryFlow />, { state: initialState });

    fireEvent.press(screen.getByTestId('ledger-discovery-device-chip'));
    fireEvent.press(screen.getByTestId('ledger-discovery-device-option-flex'));
    fireEvent.press(screen.getByTestId('ledger-discovery-save-button'));

    expect(
      screen.getByTestId('ledger-discovery-account-selection'),
    ).toHaveTextContent('Account selection for Flex');
  });
});
