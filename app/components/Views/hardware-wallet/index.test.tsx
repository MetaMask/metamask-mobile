import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { Linking, View as MockView } from 'react-native';
import {
  ConnectionStatus,
  ErrorCode,
  HardwareWalletType,
} from '@metamask/hw-wallet-sdk';

import renderWithProvider from '../../../util/test/renderWithProvider';
import { useHardwareWallet } from '../../../core/HardwareWallet';
import { AppThemeKey } from '../../../util/theme/models';
import HardwareWallet from './index';
import HardwareWalletTestIds from './hardwareWallet.testIds';

const mockDispatch = jest.fn();
const mockGoBack = jest.fn();
const mockEnsureDeviceReady = jest.fn();
const mockSetTargetWalletType = jest.fn();
const mockSelectDiscoveredDevice = jest.fn();
const mockConnectToDevice = jest.fn();
const mockRetryEnsureDeviceReady = jest.fn();
const mockCloseConnectionFlow = jest.fn();
const mockAcknowledgeConnectionSuccess = jest.fn();
const mockSetConnectionSheetVisible = jest.fn();
const mockReplace = jest.fn((name: string) => ({
  type: 'REPLACE',
  payload: { name },
}));

jest.mock('../../../core/HardwareWallet', () => ({
  useHardwareWallet: jest.fn(),
}));

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const mockReact = jest.requireActual('react');

    return ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => mockReact.createElement(MockView, { testID }, children);
  },
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    dispatch: mockDispatch,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {},
  }),
  StackActions: {
    replace: (name: string) => mockReplace(name),
  },
}));

const mockUseHardwareWallet = useHardwareWallet as jest.MockedFunction<
  typeof useHardwareWallet
>;
const mockOpenSettings = jest.spyOn(Linking, 'openSettings');
const mockOpenURL = jest.spyOn(Linking, 'openURL');

const initialState = {
  user: {
    appTheme: AppThemeKey.light,
  },
};

describe('HardwareWallet onboarding screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenSettings.mockResolvedValue();
    mockOpenURL.mockResolvedValue('App-Prefs:Bluetooth');

    mockEnsureDeviceReady.mockResolvedValue(false);
    mockConnectToDevice.mockResolvedValue(false);
    mockRetryEnsureDeviceReady.mockResolvedValue(false);

    mockUseHardwareWallet.mockReturnValue({
      walletType: HardwareWalletType.Ledger,
      deviceId: null,
      connectionState: { status: ConnectionStatus.Scanning },
      deviceSelection: {
        devices: [],
        selectedDevice: null,
        isScanning: true,
        scanError: null,
      },
      ensureDeviceReady: mockEnsureDeviceReady,
      setTargetWalletType: mockSetTargetWalletType,
      selectDiscoveredDevice: mockSelectDiscoveredDevice,
      rescanDevices: jest.fn(),
      connectToDevice: mockConnectToDevice,
      retryEnsureDeviceReady: mockRetryEnsureDeviceReady,
      closeConnectionFlow: mockCloseConnectionFlow,
      acknowledgeConnectionSuccess: mockAcknowledgeConnectionSuccess,
      setConnectionSheetVisible: mockSetConnectionSheetVisible,
      showHardwareWalletError: jest.fn(),
      showAwaitingConfirmation: jest.fn(),
      hideAwaitingConfirmation: jest.fn(),
    });
  });

  it('starts Ledger onboarding and renders the looking state', async () => {
    const { getByTestId, getByText } = renderWithProvider(<HardwareWallet />, {
      state: initialState,
    });

    expect(getByTestId(HardwareWalletTestIds.LOOKING_FOR_DEVICE)).toBeTruthy();
    expect(getByText('Looking for your device')).toBeTruthy();

    await waitFor(() => {
      expect(mockSetConnectionSheetVisible).toHaveBeenCalledWith(false);
      expect(mockSetTargetWalletType).toHaveBeenCalledWith(
        HardwareWalletType.Ledger,
      );
      expect(mockEnsureDeviceReady).toHaveBeenCalledWith();
    });
  });

  it('renders the device found state when Ledger devices are discovered', () => {
    mockUseHardwareWallet.mockReturnValue({
      walletType: HardwareWalletType.Ledger,
      deviceId: null,
      connectionState: { status: ConnectionStatus.Scanning },
      deviceSelection: {
        devices: [{ id: 'ledger-1', name: 'Nano X' }],
        selectedDevice: { id: 'ledger-1', name: 'Nano X' },
        isScanning: true,
        scanError: null,
      },
      ensureDeviceReady: mockEnsureDeviceReady,
      setTargetWalletType: mockSetTargetWalletType,
      selectDiscoveredDevice: mockSelectDiscoveredDevice,
      rescanDevices: jest.fn(),
      connectToDevice: mockConnectToDevice,
      retryEnsureDeviceReady: mockRetryEnsureDeviceReady,
      closeConnectionFlow: mockCloseConnectionFlow,
      acknowledgeConnectionSuccess: mockAcknowledgeConnectionSuccess,
      setConnectionSheetVisible: mockSetConnectionSheetVisible,
      showHardwareWalletError: jest.fn(),
      showAwaitingConfirmation: jest.fn(),
      hideAwaitingConfirmation: jest.fn(),
    });

    const { getByTestId, getByText } = renderWithProvider(<HardwareWallet />, {
      state: initialState,
    });

    expect(getByTestId(HardwareWalletTestIds.DEVICE_FOUND)).toBeTruthy();
    expect(getByText('Ledger device found')).toBeTruthy();
    expect(getByText('Nano X')).toBeTruthy();
  });

  it('opens the selector sheet and continues with the chosen device', async () => {
    mockEnsureDeviceReady.mockResolvedValue(false);
    mockConnectToDevice.mockResolvedValue(true);

    mockUseHardwareWallet.mockReturnValue({
      walletType: HardwareWalletType.Ledger,
      deviceId: null,
      connectionState: { status: ConnectionStatus.Scanning },
      deviceSelection: {
        devices: [
          { id: 'ledger-1', name: 'Nano X' },
          { id: 'ledger-2', name: 'Flex' },
        ],
        selectedDevice: { id: 'ledger-1', name: 'Nano X' },
        isScanning: true,
        scanError: null,
      },
      ensureDeviceReady: mockEnsureDeviceReady,
      setTargetWalletType: mockSetTargetWalletType,
      selectDiscoveredDevice: mockSelectDiscoveredDevice,
      rescanDevices: jest.fn(),
      connectToDevice: mockConnectToDevice,
      retryEnsureDeviceReady: mockRetryEnsureDeviceReady,
      closeConnectionFlow: mockCloseConnectionFlow,
      acknowledgeConnectionSuccess: mockAcknowledgeConnectionSuccess,
      setConnectionSheetVisible: mockSetConnectionSheetVisible,
      showHardwareWalletError: jest.fn(),
      showAwaitingConfirmation: jest.fn(),
      hideAwaitingConfirmation: jest.fn(),
    });

    const { getByTestId } = renderWithProvider(<HardwareWallet />, {
      state: initialState,
    });

    await act(async () => {
      fireEvent.press(getByTestId(HardwareWalletTestIds.DEVICE_SELECTOR));
    });

    expect(getByTestId(HardwareWalletTestIds.DEVICE_SHEET)).toBeTruthy();

    await act(async () => {
      fireEvent.press(
        getByTestId(`${HardwareWalletTestIds.DEVICE_SHEET_ITEM}-ledger-2`),
      );
    });

    await waitFor(() => {
      expect(mockSelectDiscoveredDevice).toHaveBeenCalledWith({
        id: 'ledger-2',
        name: 'Flex',
      });
      expect(mockConnectToDevice).toHaveBeenCalledWith('ledger-2');
      expect(mockAcknowledgeConnectionSuccess).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('LedgerConnect');
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace('LedgerConnect'),
      );
    });
  });

  it('renders the not found state and retries the scan', async () => {
    mockUseHardwareWallet.mockReturnValue({
      walletType: HardwareWalletType.Ledger,
      deviceId: null,
      connectionState: {
        status: ConnectionStatus.ErrorState,
        error: {} as never,
      },
      deviceSelection: {
        devices: [],
        selectedDevice: null,
        isScanning: false,
        scanError: null,
      },
      ensureDeviceReady: mockEnsureDeviceReady,
      setTargetWalletType: mockSetTargetWalletType,
      selectDiscoveredDevice: mockSelectDiscoveredDevice,
      rescanDevices: jest.fn(),
      connectToDevice: mockConnectToDevice,
      retryEnsureDeviceReady: mockRetryEnsureDeviceReady,
      closeConnectionFlow: mockCloseConnectionFlow,
      acknowledgeConnectionSuccess: mockAcknowledgeConnectionSuccess,
      setConnectionSheetVisible: mockSetConnectionSheetVisible,
      showHardwareWalletError: jest.fn(),
      showAwaitingConfirmation: jest.fn(),
      hideAwaitingConfirmation: jest.fn(),
    });

    const { getByTestId, getByText } = renderWithProvider(<HardwareWallet />, {
      state: initialState,
    });

    expect(getByTestId(HardwareWalletTestIds.DEVICE_NOT_FOUND)).toBeTruthy();
    expect(getByText('Device not found')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId(HardwareWalletTestIds.RETRY_BUTTON));
    });

    await waitFor(() => {
      expect(mockCloseConnectionFlow).toHaveBeenCalled();
      expect(mockEnsureDeviceReady).toHaveBeenCalledTimes(2);
    });
  });

  it('renders the Ethereum app closed error state and reconnects the same device', async () => {
    mockConnectToDevice.mockResolvedValue(false);

    mockUseHardwareWallet.mockReturnValue({
      walletType: HardwareWalletType.Ledger,
      deviceId: 'ledger-1',
      connectionState: {
        status: ConnectionStatus.ErrorState,
        error: {
          code: ErrorCode.DeviceStateEthAppClosed,
          userMessage: 'Please open the Ethereum app on your device',
        } as never,
      },
      deviceSelection: {
        devices: [{ id: 'ledger-1', name: 'Nano X' }],
        selectedDevice: { id: 'ledger-1', name: 'Nano X' },
        isScanning: false,
        scanError: null,
      },
      ensureDeviceReady: mockEnsureDeviceReady,
      setTargetWalletType: mockSetTargetWalletType,
      selectDiscoveredDevice: mockSelectDiscoveredDevice,
      rescanDevices: jest.fn(),
      connectToDevice: mockConnectToDevice,
      retryEnsureDeviceReady: mockRetryEnsureDeviceReady,
      closeConnectionFlow: mockCloseConnectionFlow,
      acknowledgeConnectionSuccess: mockAcknowledgeConnectionSuccess,
      setConnectionSheetVisible: mockSetConnectionSheetVisible,
      showHardwareWalletError: jest.fn(),
      showAwaitingConfirmation: jest.fn(),
      hideAwaitingConfirmation: jest.fn(),
    });

    const { getByText } = renderWithProvider(<HardwareWallet />, {
      state: initialState,
    });

    expect(getByText('Ethereum App Not Open')).toBeTruthy();
    expect(
      getByText('Please open the Ethereum app on your device'),
    ).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('Continue'));
    });

    await waitFor(() => {
      expect(mockCloseConnectionFlow).not.toHaveBeenCalled();
      expect(mockRetryEnsureDeviceReady).toHaveBeenCalledWith('ledger-1');
    });
  });

  it('keeps showing the app-closed screen while awaiting the Ethereum app', () => {
    mockUseHardwareWallet.mockReturnValue({
      walletType: HardwareWalletType.Ledger,
      deviceId: 'ledger-1',
      connectionState: {
        status: ConnectionStatus.AwaitingApp,
        appName: 'Ethereum',
      } as never,
      deviceSelection: {
        devices: [{ id: 'ledger-1', name: 'Nano X' }],
        selectedDevice: { id: 'ledger-1', name: 'Nano X' },
        isScanning: false,
        scanError: null,
      },
      ensureDeviceReady: mockEnsureDeviceReady,
      setTargetWalletType: mockSetTargetWalletType,
      selectDiscoveredDevice: mockSelectDiscoveredDevice,
      rescanDevices: jest.fn(),
      connectToDevice: mockConnectToDevice,
      retryEnsureDeviceReady: mockRetryEnsureDeviceReady,
      closeConnectionFlow: mockCloseConnectionFlow,
      acknowledgeConnectionSuccess: mockAcknowledgeConnectionSuccess,
      setConnectionSheetVisible: mockSetConnectionSheetVisible,
      showHardwareWalletError: jest.fn(),
      showAwaitingConfirmation: jest.fn(),
      hideAwaitingConfirmation: jest.fn(),
    });

    const { getByText, queryByText } = renderWithProvider(<HardwareWallet />, {
      state: initialState,
    });

    expect(getByText('Ethereum App Not Open')).toBeTruthy();
    expect(queryByText('Ledger device found')).toBeNull();
  });

  it('renders the blind signing disabled error state and retries the same device', async () => {
    mockConnectToDevice.mockResolvedValue(false);

    mockUseHardwareWallet.mockReturnValue({
      walletType: HardwareWalletType.Ledger,
      deviceId: 'ledger-1',
      connectionState: {
        status: ConnectionStatus.ErrorState,
        error: {
          code: ErrorCode.DeviceStateBlindSignNotSupported,
          userMessage:
            'Blind signing is disabled. Please enable it in your device settings',
        } as never,
      },
      deviceSelection: {
        devices: [{ id: 'ledger-1', name: 'Nano X' }],
        selectedDevice: { id: 'ledger-1', name: 'Nano X' },
        isScanning: false,
        scanError: null,
      },
      ensureDeviceReady: mockEnsureDeviceReady,
      setTargetWalletType: mockSetTargetWalletType,
      selectDiscoveredDevice: mockSelectDiscoveredDevice,
      rescanDevices: jest.fn(),
      connectToDevice: mockConnectToDevice,
      retryEnsureDeviceReady: mockRetryEnsureDeviceReady,
      closeConnectionFlow: mockCloseConnectionFlow,
      acknowledgeConnectionSuccess: mockAcknowledgeConnectionSuccess,
      setConnectionSheetVisible: mockSetConnectionSheetVisible,
      showHardwareWalletError: jest.fn(),
      showAwaitingConfirmation: jest.fn(),
      hideAwaitingConfirmation: jest.fn(),
    });

    const { getByText } = renderWithProvider(<HardwareWallet />, {
      state: initialState,
    });

    expect(getByText('Blind Signing Disabled')).toBeTruthy();
    expect(
      getByText(
        'Blind signing is disabled. Please enable it in your device settings',
      ),
    ).toBeTruthy();
    expect(getByText('Continue')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('Continue'));
    });

    expect(mockRetryEnsureDeviceReady).toHaveBeenCalledWith('ledger-1');
    expect(mockCloseConnectionFlow).not.toHaveBeenCalled();
  });

  it('renders the device unresponsive error state and retries the same device', async () => {
    mockConnectToDevice.mockResolvedValue(false);

    mockUseHardwareWallet.mockReturnValue({
      walletType: HardwareWalletType.Ledger,
      deviceId: 'ledger-1',
      connectionState: {
        status: ConnectionStatus.ErrorState,
        error: {
          code: ErrorCode.DeviceUnresponsive,
          userMessage: 'Connection timed out. Please try again',
        } as never,
      },
      deviceSelection: {
        devices: [{ id: 'ledger-1', name: 'Nano X' }],
        selectedDevice: { id: 'ledger-1', name: 'Nano X' },
        isScanning: false,
        scanError: null,
      },
      ensureDeviceReady: mockEnsureDeviceReady,
      setTargetWalletType: mockSetTargetWalletType,
      selectDiscoveredDevice: mockSelectDiscoveredDevice,
      rescanDevices: jest.fn(),
      connectToDevice: mockConnectToDevice,
      retryEnsureDeviceReady: mockRetryEnsureDeviceReady,
      closeConnectionFlow: mockCloseConnectionFlow,
      acknowledgeConnectionSuccess: mockAcknowledgeConnectionSuccess,
      setConnectionSheetVisible: mockSetConnectionSheetVisible,
      showHardwareWalletError: jest.fn(),
      showAwaitingConfirmation: jest.fn(),
      hideAwaitingConfirmation: jest.fn(),
    });

    const { getByText } = renderWithProvider(<HardwareWallet />, {
      state: initialState,
    });

    expect(getByText('Device Unresponsive')).toBeTruthy();
    expect(getByText('Connection timed out. Please try again')).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('Retry'));
    });

    expect(mockRetryEnsureDeviceReady).toHaveBeenCalledWith('ledger-1');
    expect(mockCloseConnectionFlow).not.toHaveBeenCalled();
  });

  it('renders the generic Ledger error state and allows exiting the flow', async () => {
    mockConnectToDevice.mockResolvedValue(false);

    mockUseHardwareWallet.mockReturnValue({
      walletType: HardwareWalletType.Ledger,
      deviceId: 'ledger-1',
      connectionState: {
        status: ConnectionStatus.ErrorState,
        error: {
          code: ErrorCode.Unknown,
          userMessage:
            'Make sure your Ledger is set up with the Secret Recovery Phrase or passphrase for this account',
        } as never,
      },
      deviceSelection: {
        devices: [{ id: 'ledger-1', name: 'Nano X' }],
        selectedDevice: { id: 'ledger-1', name: 'Nano X' },
        isScanning: false,
        scanError: null,
      },
      ensureDeviceReady: mockEnsureDeviceReady,
      setTargetWalletType: mockSetTargetWalletType,
      selectDiscoveredDevice: mockSelectDiscoveredDevice,
      rescanDevices: jest.fn(),
      connectToDevice: mockConnectToDevice,
      retryEnsureDeviceReady: mockRetryEnsureDeviceReady,
      closeConnectionFlow: mockCloseConnectionFlow,
      acknowledgeConnectionSuccess: mockAcknowledgeConnectionSuccess,
      setConnectionSheetVisible: mockSetConnectionSheetVisible,
      showHardwareWalletError: jest.fn(),
      showAwaitingConfirmation: jest.fn(),
      hideAwaitingConfirmation: jest.fn(),
    });

    const { getByText } = renderWithProvider(<HardwareWallet />, {
      state: initialState,
    });

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(
      getByText(
        'Make sure your Ledger is set up with the Secret Recovery Phrase or passphrase for this account',
      ),
    ).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();
    expect(getByText('Continue')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('Retry'));
    });

    expect(mockRetryEnsureDeviceReady).toHaveBeenCalledWith('ledger-1');
    expect(mockCloseConnectionFlow).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(getByText('Continue'));
    });

    expect(mockCloseConnectionFlow).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it.each([
    [
      ErrorCode.PermissionBluetoothDenied,
      'Bluetooth access denied',
      'Enable Bluetooth in your device settings to connect your Ledger device',
    ],
    [
      ErrorCode.PermissionLocationDenied,
      'Location access denied',
      'Enable location permissions in your device settings to connect your Ledger device',
    ],
    [
      ErrorCode.PermissionNearbyDevicesDenied,
      'Permissions to nearby devices denied',
      'Enable access to nearby devices in Settings to connect your Ledger device',
    ],
    [
      ErrorCode.BluetoothDisabled,
      'Bluetooth is turned off',
      'Enable Bluetooth in your device settings to connect your Ledger device',
    ],
    [
      ErrorCode.BluetoothConnectionFailed,
      'Bluetooth connection failed',
      'Make sure your device is nearby, then try reconnecting',
    ],
  ])(
    'renders the Bluetooth-specific error state for %s',
    (errorCodeValue, title, description) => {
      mockUseHardwareWallet.mockReturnValue({
        walletType: HardwareWalletType.Ledger,
        deviceId: null,
        connectionState: {
          status: ConnectionStatus.ErrorState,
          error: {
            code: errorCodeValue,
            userMessage: description,
          } as never,
        },
        deviceSelection: {
          devices: [],
          selectedDevice: null,
          isScanning: false,
          scanError: null,
        },
        ensureDeviceReady: mockEnsureDeviceReady,
        setTargetWalletType: mockSetTargetWalletType,
        selectDiscoveredDevice: mockSelectDiscoveredDevice,
        rescanDevices: jest.fn(),
        connectToDevice: mockConnectToDevice,
        closeConnectionFlow: mockCloseConnectionFlow,
        acknowledgeConnectionSuccess: mockAcknowledgeConnectionSuccess,
        setConnectionSheetVisible: mockSetConnectionSheetVisible,
        showHardwareWalletError: jest.fn(),
        showAwaitingConfirmation: jest.fn(),
        hideAwaitingConfirmation: jest.fn(),
      });

      const { getByText } = renderWithProvider(<HardwareWallet />, {
        state: initialState,
      });

      expect(getByText(title)).toBeTruthy();
      expect(getByText(description)).toBeTruthy();
    },
  );

  it('opens settings from the Bluetooth access denied state', async () => {
    mockUseHardwareWallet.mockReturnValue({
      walletType: HardwareWalletType.Ledger,
      deviceId: null,
      connectionState: {
        status: ConnectionStatus.ErrorState,
        error: {
          code: ErrorCode.PermissionBluetoothDenied,
          userMessage:
            'Enable Bluetooth in your device settings to connect your Ledger device',
        } as never,
      },
      deviceSelection: {
        devices: [],
        selectedDevice: null,
        isScanning: false,
        scanError: null,
      },
      ensureDeviceReady: mockEnsureDeviceReady,
      setTargetWalletType: mockSetTargetWalletType,
      selectDiscoveredDevice: mockSelectDiscoveredDevice,
      rescanDevices: jest.fn(),
      connectToDevice: mockConnectToDevice,
      retryEnsureDeviceReady: mockRetryEnsureDeviceReady,
      closeConnectionFlow: mockCloseConnectionFlow,
      acknowledgeConnectionSuccess: mockAcknowledgeConnectionSuccess,
      setConnectionSheetVisible: mockSetConnectionSheetVisible,
      showHardwareWalletError: jest.fn(),
      showAwaitingConfirmation: jest.fn(),
      hideAwaitingConfirmation: jest.fn(),
    });

    const { getByText } = renderWithProvider(<HardwareWallet />, {
      state: initialState,
    });

    await act(async () => {
      fireEvent.press(getByText('View Settings'));
    });

    expect(mockOpenSettings).toHaveBeenCalled();
  });

  it('opens Bluetooth settings from the Bluetooth disabled state', async () => {
    mockUseHardwareWallet.mockReturnValue({
      walletType: HardwareWalletType.Ledger,
      deviceId: null,
      connectionState: {
        status: ConnectionStatus.ErrorState,
        error: {
          code: ErrorCode.BluetoothDisabled,
          userMessage:
            'Enable Bluetooth in your device settings to connect your Ledger device',
        } as never,
      },
      deviceSelection: {
        devices: [],
        selectedDevice: null,
        isScanning: false,
        scanError: null,
      },
      ensureDeviceReady: mockEnsureDeviceReady,
      setTargetWalletType: mockSetTargetWalletType,
      selectDiscoveredDevice: mockSelectDiscoveredDevice,
      rescanDevices: jest.fn(),
      connectToDevice: mockConnectToDevice,
      closeConnectionFlow: mockCloseConnectionFlow,
      acknowledgeConnectionSuccess: mockAcknowledgeConnectionSuccess,
      setConnectionSheetVisible: mockSetConnectionSheetVisible,
      showHardwareWalletError: jest.fn(),
      showAwaitingConfirmation: jest.fn(),
      hideAwaitingConfirmation: jest.fn(),
    });

    const { getByText } = renderWithProvider(<HardwareWallet />, {
      state: initialState,
    });

    await act(async () => {
      fireEvent.press(getByText('View Settings'));
    });

    expect(mockOpenURL).toHaveBeenCalledWith('App-Prefs:Bluetooth');
  });

  it('retries and exits from the Bluetooth connection failed state', async () => {
    mockConnectToDevice.mockResolvedValue(false);

    mockUseHardwareWallet.mockReturnValue({
      walletType: HardwareWalletType.Ledger,
      deviceId: 'ledger-1',
      connectionState: {
        status: ConnectionStatus.ErrorState,
        error: {
          code: ErrorCode.BluetoothConnectionFailed,
          userMessage: 'Make sure your device is nearby, then try reconnecting',
        } as never,
      },
      deviceSelection: {
        devices: [{ id: 'ledger-1', name: 'Nano X' }],
        selectedDevice: { id: 'ledger-1', name: 'Nano X' },
        isScanning: false,
        scanError: null,
      },
      ensureDeviceReady: mockEnsureDeviceReady,
      setTargetWalletType: mockSetTargetWalletType,
      selectDiscoveredDevice: mockSelectDiscoveredDevice,
      rescanDevices: jest.fn(),
      connectToDevice: mockConnectToDevice,
      closeConnectionFlow: mockCloseConnectionFlow,
      acknowledgeConnectionSuccess: mockAcknowledgeConnectionSuccess,
      setConnectionSheetVisible: mockSetConnectionSheetVisible,
      showHardwareWalletError: jest.fn(),
      showAwaitingConfirmation: jest.fn(),
      hideAwaitingConfirmation: jest.fn(),
    });

    const { getByText } = renderWithProvider(<HardwareWallet />, {
      state: initialState,
    });

    await act(async () => {
      fireEvent.press(getByText('Retry'));
    });

    await waitFor(() => {
      expect(mockCloseConnectionFlow).not.toHaveBeenCalled();
      expect(mockRetryEnsureDeviceReady).toHaveBeenCalledWith('ledger-1');
    });

    await act(async () => {
      fireEvent.press(getByText('Continue'));
    });

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('does not restart the onboarding flow when hook callback identities change', async () => {
    const initialValue = {
      walletType: HardwareWalletType.Ledger,
      deviceId: null,
      connectionState: { status: ConnectionStatus.Scanning as const },
      deviceSelection: {
        devices: [],
        selectedDevice: null,
        isScanning: true,
        scanError: null,
      },
      ensureDeviceReady: jest.fn().mockResolvedValue(false),
      setTargetWalletType: jest.fn(),
      selectDiscoveredDevice: jest.fn(),
      rescanDevices: jest.fn(),
      connectToDevice: jest.fn().mockResolvedValue(false),
      closeConnectionFlow: jest.fn(),
      acknowledgeConnectionSuccess: jest.fn(),
      setConnectionSheetVisible: jest.fn(),
      showHardwareWalletError: jest.fn(),
      showAwaitingConfirmation: jest.fn(),
      hideAwaitingConfirmation: jest.fn(),
    };

    mockUseHardwareWallet.mockReturnValue(initialValue);

    const { rerender, unmount } = renderWithProvider(<HardwareWallet />, {
      state: initialState,
    });

    await waitFor(() => {
      expect(initialValue.ensureDeviceReady).toHaveBeenCalledTimes(1);
    });

    mockUseHardwareWallet.mockReturnValue({
      ...initialValue,
      ensureDeviceReady: jest.fn().mockResolvedValue(false),
      closeConnectionFlow: jest.fn(),
    });

    rerender(<HardwareWallet />);

    expect(initialValue.closeConnectionFlow).not.toHaveBeenCalled();
    expect(initialValue.ensureDeviceReady).toHaveBeenCalledTimes(1);

    unmount();

    expect(initialValue.setConnectionSheetVisible).toHaveBeenCalledWith(true);
  });

  it('does not navigate after unmount when a device connection resolves late', async () => {
    let resolveConnect: ((value: boolean) => void) | undefined;
    const slowConnectPromise = new Promise<boolean>((resolve) => {
      resolveConnect = resolve;
    });

    mockUseHardwareWallet.mockReturnValue({
      walletType: HardwareWalletType.Ledger,
      deviceId: null,
      connectionState: { status: ConnectionStatus.Scanning },
      deviceSelection: {
        devices: [{ id: 'ledger-1', name: 'Nano X' }],
        selectedDevice: { id: 'ledger-1', name: 'Nano X' },
        isScanning: true,
        scanError: null,
      },
      ensureDeviceReady: mockEnsureDeviceReady,
      setTargetWalletType: mockSetTargetWalletType,
      selectDiscoveredDevice: mockSelectDiscoveredDevice,
      rescanDevices: jest.fn(),
      connectToDevice: jest.fn().mockReturnValue(slowConnectPromise),
      closeConnectionFlow: mockCloseConnectionFlow,
      acknowledgeConnectionSuccess: mockAcknowledgeConnectionSuccess,
      setConnectionSheetVisible: mockSetConnectionSheetVisible,
      showHardwareWalletError: jest.fn(),
      showAwaitingConfirmation: jest.fn(),
      hideAwaitingConfirmation: jest.fn(),
    });

    const { getByTestId, unmount } = renderWithProvider(<HardwareWallet />, {
      state: initialState,
    });

    await act(async () => {
      fireEvent.press(getByTestId(HardwareWalletTestIds.DEVICE_SELECTOR));
    });

    await act(async () => {
      fireEvent.press(
        getByTestId(`${HardwareWalletTestIds.DEVICE_SHEET_ITEM}-ledger-1`),
      );
    });

    unmount();

    await act(async () => {
      resolveConnect?.(true);
      await slowConnectPromise;
    });

    expect(mockAcknowledgeConnectionSuccess).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith(
      StackActions.replace('LedgerConnect'),
    );
  });
});
