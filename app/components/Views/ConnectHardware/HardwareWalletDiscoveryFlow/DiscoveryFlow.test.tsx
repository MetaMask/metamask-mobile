import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { ConnectionStatus, ErrorCode } from '@metamask/hw-wallet-sdk';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import DiscoveryFlow from './DiscoveryFlow';
import type { DiscoveredDevice } from '../../../../core/HardwareWallet/types';
import { AppThemeKey } from '../../../../util/theme/models';
import { BluetoothPermissionErrors } from '../../../../core/Ledger/ledgerErrors';
import { strings } from '../../../../../locales/i18n';

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
let mockBluetoothPermissionError: BluetoothPermissionErrors | null = null;
let mockConnectionState: {
  status: ConnectionStatus;
  error?: { code: ErrorCode };
} = { status: ConnectionStatus.Disconnected };

jest.mock('../../../../core/HardwareWallet', () => ({
  useHardwareWallet: () => ({
    connectionState: mockConnectionState,
    setTargetWalletType: jest.fn(),
    setDiscoveryFlowActive: jest.fn(),
    clearHardwareWalletError: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useBluetoothPermissions', () => ({
  __esModule: true,
  default: () => ({
    hasBluetoothPermissions: mockHasPermissions,
    bluetoothPermissionError: mockBluetoothPermissionError,
  }),
}));

type TransportCallback = (isAvailable: boolean) => void;
type DeviceFoundCallback = (device: DiscoveredDevice) => void;
type ErrorCallback = (error: Error) => void;

let capturedTransportCallback: TransportCallback | null = null;
let capturedDeviceFoundCallback: DeviceFoundCallback | null = null;
let capturedErrorCallback: ErrorCallback | null = null;

const mockDestroy = jest.fn();
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockEnsureDeviceReady = jest.fn().mockResolvedValue(true);
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

jest.mock('../../../../core/HardwareWallet/adapters/factory', () => ({
  createAdapter: jest.fn().mockImplementation(() => ({
    disconnect: mockDisconnect,
    destroy: mockDestroy,
    ensureDeviceReady: mockEnsureDeviceReady,
    startDeviceDiscovery: mockStartDeviceDiscovery,
    isTransportAvailable: mockIsTransportAvailable,
    onTransportStateChange: mockOnTransportStateChange,
    walletType: 'ledger',
    requiresDeviceDiscovery: true,
  })),
}));

jest.mock('./configs', () => ({
  getConfigForWalletType: jest.fn().mockImplementation(() => {
    const { ErrorCode: MockErrorCode } = jest.requireActual(
      '@metamask/hw-wallet-sdk',
    );
    const { DiscoveryStep: MockDiscoveryStep } = jest.requireActual(
      './DiscoveryFlow.machine.types',
    );

    return {
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
      errorToStepMap: {
        [MockErrorCode.AuthenticationDeviceLocked]:
          MockDiscoveryStep.DeviceLocked,
        [MockErrorCode.DeviceUnresponsive]:
          MockDiscoveryStep.DeviceUnresponsive,
        [MockErrorCode.DeviceStateEthAppClosed]: MockDiscoveryStep.AppNotOpen,
        [MockErrorCode.BluetoothDisabled]:
          MockDiscoveryStep.TransportUnavailable,
        [MockErrorCode.BluetoothConnectionFailed]:
          MockDiscoveryStep.TransportConnectionFailed,
        [MockErrorCode.BluetoothScanFailed]:
          MockDiscoveryStep.TransportConnectionFailed,
        [MockErrorCode.PermissionBluetoothDenied]:
          MockDiscoveryStep.BluetoothAccessDenied,
        [MockErrorCode.PermissionLocationDenied]:
          MockDiscoveryStep.LocationAccessDenied,
        [MockErrorCode.PermissionNearbyDevicesDenied]:
          MockDiscoveryStep.NearbyDevicesDenied,
      },
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
    };
  }),
}));

jest.mock('./screens/DiscoveryFound', () => {
  const ReactActual = jest.requireActual('react');
  const { Text, Pressable } = jest.requireActual('react-native');
  return ({
    deviceName,
    onConnect,
  }: {
    deviceName: string;
    onConnect: () => void;
  }) =>
    ReactActual.createElement(
      ReactActual.Fragment,
      null,
      ReactActual.createElement(
        Text,
        { testID: 'discovery-found' },
        `Found: ${deviceName}`,
      ),
      ReactActual.createElement(
        Pressable,
        { testID: 'discovery-connect-button', onPress: onConnect },
        ReactActual.createElement(Text, null, 'Connect'),
      ),
    );
});

jest.mock('./screens/DiscoverySelectDevice', () => () => null);

jest.mock('./screens/DiscoveryAccountSelection', () => () => null);

const NANO_X: DiscoveredDevice = { id: 'nano-x', name: 'Nano X' };

const initialState = { user: { appTheme: AppThemeKey.dark } };

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
    mockBluetoothPermissionError = null;
    mockConnectionState = { status: ConnectionStatus.Disconnected };
    capturedTransportCallback = null;
    capturedDeviceFoundCallback = null;
    capturedErrorCallback = null;
    mockDisconnect.mockResolvedValue(undefined);
    mockIsTransportAvailable.mockResolvedValue(true);
    mockEnsureDeviceReady.mockResolvedValue(true);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
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

  it('shows bluetooth access denied screen for blocked bluetooth permission', () => {
    mockBluetoothPermissionError =
      BluetoothPermissionErrors.BluetoothAccessBlocked;

    renderFlow();

    expect(
      screen.getByText(strings('ledger.bluetooth_access_denied')),
    ).toBeOnTheScreen();
  });

  it('shows bluetooth off screen when transport becomes unavailable after being available', async () => {
    renderFlow();
    await simulateBluetoothOn();

    act(() => {
      capturedTransportCallback?.(false);
    });
    await act(async () => undefined);

    expect(
      screen.getByText(strings('ledger.bluetooth_turned_off')),
    ).toBeOnTheScreen();
  });

  it('shows bluetooth off screen when transport is unavailable on initial load', async () => {
    renderFlow();

    act(() => {
      capturedTransportCallback?.(false);
    });
    await act(async () => undefined);

    expect(
      screen.getByText(strings('ledger.bluetooth_turned_off')),
    ).toBeOnTheScreen();
  });

  it('auto-recovers from transport-unavailable when transport becomes available', async () => {
    renderFlow();

    act(() => {
      capturedTransportCallback?.(false);
    });
    await act(async () => undefined);

    expect(
      screen.getByText(strings('ledger.bluetooth_turned_off')),
    ).toBeOnTheScreen();

    await simulateBluetoothOn();
    simulateDeviceFound(NANO_X);

    expect(screen.getByText('Found: Nano X')).toBeOnTheScreen();
  });

  it('shows ledger locked screen when connect fails with locked error', async () => {
    mockEnsureDeviceReady.mockRejectedValueOnce(
      Object.assign(new Error('Locked device'), {
        errorCode: ErrorCode.AuthenticationDeviceLocked,
      }),
    );

    renderFlow();
    await simulateBluetoothOn();
    simulateDeviceFound(NANO_X);

    fireEvent.press(screen.getByTestId('discovery-connect-button'));

    expect(
      await screen.findByText(strings('ledger.ledger_is_locked')),
    ).toBeOnTheScreen();
  });

  it('shows eth app closed screen when ensureDeviceReady returns not ready with DeviceStateEthAppClosed', async () => {
    mockEnsureDeviceReady.mockResolvedValueOnce({
      ready: false,
      errorCode: ErrorCode.DeviceStateEthAppClosed,
    });

    renderFlow();
    await simulateBluetoothOn();
    simulateDeviceFound(NANO_X);

    fireEvent.press(screen.getByTestId('discovery-connect-button'));

    expect(
      await screen.findByText(strings('ledger.ethereum_app_closed')),
    ).toBeOnTheScreen();
  });

  it('shows generic provider error screen for unmapped hardware wallet errors', () => {
    mockConnectionState = {
      status: ConnectionStatus.ErrorState,
      error: { code: ErrorCode.Unknown },
    };

    renderFlow();

    expect(
      screen.getByText(strings('hardware_wallet.error.title')),
    ).toBeOnTheScreen();
  });
});
