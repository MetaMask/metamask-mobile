import React from 'react';
import LedgerConnect from '.';
import renderWithProvider from '../../../util/test/renderWithProvider';
import useBluetoothPermissions from '../../hooks/useBluetoothPermissions';
import useBluetooth from '../../hooks/Ledger/useBluetooth';
import useBluetoothDevices from '../../hooks/Ledger/useBluetoothDevices';
import { fireEvent } from '@testing-library/react-native';
import useLedgerBluetooth from '../../hooks/Ledger/useLedgerBluetooth';
import { useNavigation } from '@react-navigation/native';
import { LedgerCommunicationErrors } from '../../../core/Ledger/ledgerErrors';
import { strings } from '../../../../locales/i18n';
import { getSystemVersion } from 'react-native-device-info';
import Device from '../../../util/device';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  getSystemVersion: jest.fn(),
}));

jest.mock('../../../util/device', () => ({
  ...jest.requireActual('../../../util/device'),
  isAndroid: jest.fn(),
  isIos: jest.fn(),
  getDeviceWidth: jest.fn(),
  getDeviceHeight: jest.fn(),
}));

jest.mock('../../../core/Ledger/Ledger', () => ({
  unlockLedgerDefaultAccount: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
    },
    AccountTrackerController: {
      syncBalanceWithAddresses: jest.fn(),
    },
  },
}));

jest.mock('../../hooks/Ledger/useBluetooth', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/Ledger/useBluetoothDevices', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useBluetoothPermissions', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/Ledger/useLedgerBluetooth', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('react-native-permissions', () => ({
  openSettings: jest.fn(),
}));

describe('LedgerConnect', () => {
  const checkLedgerCommunicationErrorFlow = function (
    ledgerCommunicationError: LedgerCommunicationErrors,
    expectedTitle: string,
    expectedErrorBody: string,
  ) {
    useLedgerBluetooth.mockReturnValue({
      isSendingLedgerCommands: true,
      isAppLaunchConfirmationNeeded: false,
      ledgerLogicToRun: jest.fn(),
      error: ledgerCommunicationError,
    });

    const { getByText } = renderWithProvider(<LedgerConnect />);

    expect(getByText(expectedTitle)).toBeTruthy();
    expect(getByText(expectedErrorBody)).toBeTruthy();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    //mock hook return value;
    useBluetoothPermissions.mockReturnValue({
      hasBluetoothPermissions: true,
      bluetoothPermissionError: null,
      checkPermissions: jest.fn(),
    });

    useBluetooth.mockReturnValue({
      bluetoothOn: true,
      bluetoothConnectionError: false,
    });

    useBluetoothDevices.mockReturnValue({
      devices: [{ id: '1', name: 'Ledger Nano X', value: '1' }],
      deviceScanError: false,
    });

    useLedgerBluetooth.mockReturnValue({
      isSendingLedgerCommands: false,
      isAppLaunchConfirmationNeeded: false,
      ledgerLogicToRun: jest.fn(),
      error: null,
    });

    useNavigation.mockReturnValue({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      dispatch: jest.fn(),
    });

    getSystemVersion.mockReturnValue('13');
    Device.isAndroid.mockReturnValue(true);
    Device.isIos.mockReturnValue(false);
    Device.getDeviceWidth.mockReturnValue(50);
    Device.getDeviceHeight.mockReturnValue(50);
  });

  it('should render correctly', () => {
    const wrapper = renderWithProvider(<LedgerConnect />);
    expect(wrapper).toMatchSnapshot();
  });

  it('calls connectLedger when continue button is pressed', () => {
    const ledgerLogicToRun = jest.fn();

    useLedgerBluetooth.mockReturnValue({
      isSendingLedgerCommands: false,
      isAppLaunchConfirmationNeeded: false,
      ledgerLogicToRun,
      error: null,
    });

    ledgerLogicToRun.mockImplementation((callback) => callback());

    const { getByTestId } = renderWithProvider(<LedgerConnect />);

    const continueButton = getByTestId('add-network-button');
    fireEvent.press(continueButton);

    expect(ledgerLogicToRun).toHaveBeenCalled();
  });

  it('should show error when LedgerCommunicationError FailedToOpenApp is returned', () => {
    checkLedgerCommunicationErrorFlow(
      LedgerCommunicationErrors.FailedToOpenApp,
      strings('ledger.failed_to_open_eth_app'),
      strings('ledger.ethereum_app_open_error'),
    );
  });

  it('should show error when LedgerCommunicationError FailedToCloseApp is returned', () => {
    checkLedgerCommunicationErrorFlow(
      LedgerCommunicationErrors.FailedToCloseApp,
      strings('ledger.running_app_close'),
      strings('ledger.running_app_close_error'),
    );
  });

  it('should show error when LedgerCommunicationError AppIsNotInstalled is returned', () => {
    checkLedgerCommunicationErrorFlow(
      LedgerCommunicationErrors.AppIsNotInstalled,
      strings('ledger.ethereum_app_not_installed'),
      strings('ledger.ethereum_app_not_installed_error'),
    );
  });

  it('should show error when LedgerCommunicationError LedgerIsLocked is returned', () => {
    checkLedgerCommunicationErrorFlow(
      LedgerCommunicationErrors.LedgerIsLocked,
      strings('ledger.ledger_is_locked'),
      strings('ledger.unlock_ledger_message'),
    );
  });

  it('should navigate to selectHardwareWallet when default LedgerCommunicationError is returned', () => {
    const navigate = jest.fn();
    useNavigation.mockReturnValue({
      navigate,
      setOptions: jest.fn(),
      dispatch: jest.fn(),
    });

    useLedgerBluetooth.mockReturnValue({
      isSendingLedgerCommands: true,
      isAppLaunchConfirmationNeeded: false,
      ledgerLogicToRun: jest.fn(),
      error: LedgerCommunicationErrors.LedgerHasPendingConfirmation,
    });

    renderWithProvider(<LedgerConnect />);

    expect(navigate).toHaveBeenNthCalledWith(1, 'SelectHardwareWallet');
  });

  it('should show correct permission text when device is android 12+ ', () => {
    getSystemVersion.mockReturnValue('13');
    const { getByText } = renderWithProvider(<LedgerConnect />);
    expect(
      getByText(
        strings('ledger.ledger_reminder_message_step_four_Androidv12plus'),
      ),
    ).toBeTruthy();
  });

  it('should show correct permission text when device is android 11 ', () => {
    getSystemVersion.mockReturnValue('11');
    const { getByText } = renderWithProvider(<LedgerConnect />);
    expect(
      getByText(strings('ledger.ledger_reminder_message_step_four')),
    ).toBeTruthy();
  });

  it('should open how to install eth app link when clicked', () => {
    const navigate = jest.fn();
    useNavigation.mockReturnValue({
      navigate,
      setOptions: jest.fn(),
      dispatch: jest.fn(),
    });

    const { getByText } = renderWithProvider(<LedgerConnect />);
    const installInstructionsLink = getByText(
      strings('ledger.how_to_install_eth_app'),
    );
    fireEvent.press(installInstructionsLink);

    expect(navigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.ledger.com/hc/en-us/articles/360009576554-Ethereum-ETH-?docs=true',
        title: strings('ledger.how_to_install_eth_webview_title'),
      },
    });
  });

  it('should call connectLedger when retry button is pressed', () => {
    const ledgerLogicToRun = jest.fn();

    useLedgerBluetooth.mockReturnValue({
      isSendingLedgerCommands: true,
      isAppLaunchConfirmationNeeded: false,
      ledgerLogicToRun,
      error: LedgerCommunicationErrors.FailedToOpenApp,
    });

    renderWithProvider(<LedgerConnect />);

    const { getByTestId } = renderWithProvider(<LedgerConnect />);

    const retryButton = getByTestId('add-network-button');
    fireEvent.press(retryButton);

    expect(ledgerLogicToRun).toHaveBeenCalled();
  });
});
