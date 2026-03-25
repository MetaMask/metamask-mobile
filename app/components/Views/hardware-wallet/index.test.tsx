import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { ConnectionStatus, HardwareWalletType } from '@metamask/hw-wallet-sdk';

import renderWithProvider from '../../../util/test/renderWithProvider';
import { useHardwareWallet } from '../../../core/HardwareWallet';
import HardwareWallet from './index';
import HardwareWalletTestIds from './hardwareWallet.testIds';

const mockDispatch = jest.fn();
const mockEnsureDeviceReady = jest.fn();
const mockSetTargetWalletType = jest.fn();
const mockSelectDiscoveredDevice = jest.fn();
const mockConnectToDevice = jest.fn();
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
    const React = require('react');
    const { View: MockView } = require('react-native');

    return ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => React.createElement(MockView, { testID }, children);
  },
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    dispatch: mockDispatch,
  }),
  StackActions: {
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

const mockUseHardwareWallet = useHardwareWallet as jest.MockedFunction<
  typeof useHardwareWallet
>;

const initialState = {
  user: {
    appTheme: 'light',
  },
};

describe('HardwareWallet onboarding screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockEnsureDeviceReady.mockResolvedValue(false);
    mockConnectToDevice.mockResolvedValue(false);

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
      expect(mockSetConnectionSheetVisible).toHaveBeenCalledWith(true);
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
      connectionState: { status: ConnectionStatus.ErrorState, error: {} as never },
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
