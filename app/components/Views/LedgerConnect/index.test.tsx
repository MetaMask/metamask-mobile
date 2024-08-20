import React from 'react';
import LedgerConnect from '.';
import renderWithProvider from '../../../util/test/renderWithProvider';
import useBluetoothPermissions from '../../hooks/useBluetoothPermissions';
import useBluetooth from '../../hooks/Ledger/useBluetooth';
import useBluetoothDevices, {
  BluetoothDevice,
} from '../../hooks/Ledger/useBluetoothDevices';
import { fireEvent } from '@testing-library/react-native';
import useLedgerBluetooth from '../../hooks/Ledger/useLedgerBluetooth';
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { LedgerCommunicationErrors } from '../../../core/Ledger/ledgerErrors';
import { strings } from '../../../../locales/i18n';
import { getSystemVersion } from 'react-native-device-info';
import Device from '../../../util/device';
import { LEDGER_SUPPORT_LINK } from '../../../constants/urls';

// Add types for the mocked hooks
interface UseBluetoothPermissionsHook {
  hasBluetoothPermissions: boolean;
  bluetoothPermissionError: string | undefined;
  checkPermissions: jest.Mock;
}

interface UseBluetoothHook {
  bluetoothOn: boolean;
  bluetoothConnectionError: boolean | undefined;
}

interface UseBluetoothDevicesHook {
  devices: BluetoothDevice[];
  deviceScanError: boolean;
}

interface UseLedgerBluetoothHook {
  isSendingLedgerCommands: boolean;
  isAppLaunchConfirmationNeeded: boolean;
  ledgerLogicToRun: jest.Mock;
  error: LedgerCommunicationErrors | undefined;
}

jest.mock('../../hooks/useBluetoothPermissions');
jest.mock('../../hooks/Ledger/useBluetooth');
jest.mock('../../hooks/Ledger/useBluetoothDevices');
jest.mock('../../hooks/Ledger/useLedgerBluetooth');
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

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
  isIphoneX: jest.fn(),
  getDeviceWidth: jest.fn(),
  getDeviceHeight: jest.fn(),
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
  default: jest.fn(() => ({
    bluetoothOn: true,
    bluetoothConnectionError: false,
  })),
}));

jest.mock('../../hooks/Ledger/useBluetoothDevices', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    devices: [],
    deviceScanError: false,
  })),
}));

jest.mock('../../hooks/useBluetoothPermissions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    hasBluetoothPermissions: true,
    bluetoothPermissionError: undefined,
    checkPermissions: jest.fn(),
  })),
}));

jest.mock('../../hooks/Ledger/useLedgerBluetooth', () => ({
  __esModule: true,
  default: jest.fn((_deviceId?: string) => ({
    isSendingLedgerCommands: false,
    isAppLaunchConfirmationNeeded: false,
    ledgerLogicToRun: jest.fn(),
    error: undefined,
  })),
}));

jest.mock('react-native-permissions', () => ({
  openSettings: jest.fn(),
}));

describe('LedgerConnect', () => {
  const onConfirmationComplete = jest.fn();

  const checkLedgerCommunicationErrorFlow = function (
    ledgerCommunicationError: LedgerCommunicationErrors,
    expectedTitle: string,
    expectedErrorBody: string,
  ) {
    (useLedgerBluetooth as jest.Mock).mockReturnValue({
      isSendingLedgerCommands: true,
      isAppLaunchConfirmationNeeded: false,
      ledgerLogicToRun: jest.fn(),
      error: ledgerCommunicationError,
    });

    const { getByText } = renderWithProvider(
      <LedgerConnect onConnectLedger={onConfirmationComplete} />,
    );

    expect(getByText(expectedTitle)).toBeTruthy();
    expect(getByText(expectedErrorBody)).toBeTruthy();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    //mock hook return values
    (
      useBluetoothPermissions as jest.MockedFunction<
        () => UseBluetoothPermissionsHook
      >
    ).mockReturnValue({
      hasBluetoothPermissions: true,
      bluetoothPermissionError: undefined,
      checkPermissions: jest.fn(),
    });

    (
      useBluetooth as jest.MockedFunction<() => UseBluetoothHook>
    ).mockReturnValue({
      bluetoothOn: true,
      bluetoothConnectionError: false,
    });

    (
      useBluetoothDevices as jest.MockedFunction<() => UseBluetoothDevicesHook>
    ).mockReturnValue({
      devices: [{ id: '1', name: 'Ledger device' }],
      deviceScanError: false,
    });

    (
      useLedgerBluetooth as unknown as jest.MockedFunction<
        typeof useLedgerBluetooth
      >
    ).mockImplementation(() => ({
      isSendingLedgerCommands: false,
      isAppLaunchConfirmationNeeded: false,
      ledgerLogicToRun: jest.fn(),
      error: undefined,
      cleanupBluetoothConnection(): void {
        throw new Error('Function not implemented.');
      },
    }));

    (
      useNavigation as jest.MockedFunction<typeof useNavigation>
    ).mockReturnValue({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      dispatch: jest.fn(),
    } as unknown as NavigationProp<ParamListBase>);

    jest.mocked(getSystemVersion).mockReturnValue('13');
    jest.mocked(Device.isAndroid).mockReturnValue(true);
    jest.mocked(Device.isIos).mockReturnValue(false);
    jest.mocked(Device.isIphoneX).mockReturnValue(false);
    jest.mocked(Device.getDeviceWidth).mockReturnValue(50);
    jest.mocked(Device.getDeviceHeight).mockReturnValue(50);
  });

  it('render matches latest snapshot', () => {
    const wrapper = renderWithProvider(
      <LedgerConnect onConnectLedger={onConfirmationComplete} />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('calls connectLedger when continue button is pressed', () => {
    const ledgerLogicToRun = jest.fn();

    (
      useLedgerBluetooth as unknown as jest.MockedFunction<
        typeof useLedgerBluetooth
      >
    ).mockReturnValue({
      isSendingLedgerCommands: false,
      isAppLaunchConfirmationNeeded: false,
      ledgerLogicToRun,
      error: undefined,
      cleanupBluetoothConnection(): void {
        throw new Error('Function not implemented.');
      },
    });

    ledgerLogicToRun.mockImplementation((callback: () => void) => callback());

    const { getByTestId } = renderWithProvider(
      <LedgerConnect onConnectLedger={onConfirmationComplete} />,
    );

    const continueButton = getByTestId('add-network-button');
    fireEvent.press(continueButton);

    expect(ledgerLogicToRun).toHaveBeenCalled();
  });

  it('displays error on LedgerCommunicationError FailedToOpenApp', () => {
    checkLedgerCommunicationErrorFlow(
      LedgerCommunicationErrors.FailedToOpenApp,
      strings('ledger.failed_to_open_eth_app'),
      strings('ledger.ethereum_app_open_error'),
    );
  });

  it('displays error on LedgerCommunicationError FailedToCloseApp', () => {
    checkLedgerCommunicationErrorFlow(
      LedgerCommunicationErrors.FailedToCloseApp,
      strings('ledger.running_app_close'),
      strings('ledger.running_app_close_error'),
    );
  });

  it('displays error on LedgerCommunicationError AppIsNotInstalled', () => {
    checkLedgerCommunicationErrorFlow(
      LedgerCommunicationErrors.AppIsNotInstalled,
      strings('ledger.ethereum_app_not_installed'),
      strings('ledger.ethereum_app_not_installed_error'),
    );
  });

  it('displays error on LedgerCommunicationError LedgerIsLocked', () => {
    checkLedgerCommunicationErrorFlow(
      LedgerCommunicationErrors.LedgerIsLocked,
      strings('ledger.ledger_is_locked'),
      strings('ledger.unlock_ledger_message'),
    );
  });

  it('navigates to selectHardwareWallet on default LedgerCommunicationError', () => {
    const navigate = jest.fn();
    jest.mocked(useNavigation).mockReturnValue({
      navigate,
      setOptions: jest.fn(),
      dispatch: jest.fn(),
    } as unknown as NavigationProp<ParamListBase>);

    (
      useLedgerBluetooth as unknown as jest.MockedFunction<
        () => UseLedgerBluetoothHook
      >
    ).mockReturnValue({
      isSendingLedgerCommands: true,
      isAppLaunchConfirmationNeeded: false,
      ledgerLogicToRun: jest.fn(),
      error: LedgerCommunicationErrors.LedgerHasPendingConfirmation,
    });

    renderWithProvider(
      <LedgerConnect onConnectLedger={onConfirmationComplete} />,
    );

    expect(navigate).toHaveBeenNthCalledWith(1, 'SelectHardwareWallet');
  });

  it('displays android 12+ permission text on android 12+ device', () => {
    jest.mocked(getSystemVersion).mockReturnValue('13');
    const { getByText } = renderWithProvider(
      <LedgerConnect onConnectLedger={onConfirmationComplete} />,
    );
    expect(
      getByText(
        strings('ledger.ledger_reminder_message_step_four_Androidv12plus'),
      ),
    ).toBeTruthy();
  });

  it('displays android 11 permission text on android 11 device', () => {
    jest.mocked(getSystemVersion).mockReturnValue('11');
    const { getByText } = renderWithProvider(
      <LedgerConnect onConnectLedger={onConfirmationComplete} />,
    );
    expect(
      getByText(strings('ledger.ledger_reminder_message_step_four')),
    ).toBeTruthy();
  });

  it('opens "how to install eth" on link', () => {
    const navigate = jest.fn();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate,
      setOptions: jest.fn(),
      dispatch: jest.fn(),
    });

    const { getByText } = renderWithProvider(
      <LedgerConnect onConnectLedger={onConfirmationComplete} />,
    );
    const installInstructionsLink = getByText(
      strings('ledger.how_to_install_eth_app'),
    );
    fireEvent.press(installInstructionsLink);

    expect(navigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: LEDGER_SUPPORT_LINK,
        title: strings('ledger.how_to_install_eth_webview_title'),
      },
    });
  });

  it('calls connectLedger on retry button', () => {
    const ledgerLogicToRun = jest.fn();

    (
      useLedgerBluetooth as unknown as jest.MockedFunction<
        typeof useLedgerBluetooth
      >
    ).mockReturnValue({
      isSendingLedgerCommands: true,
      isAppLaunchConfirmationNeeded: false,
      ledgerLogicToRun,
      error: LedgerCommunicationErrors.FailedToOpenApp,
      cleanupBluetoothConnection(): void {
        throw new Error('Function not implemented.');
      },
    });

    const { getByTestId } = renderWithProvider(
      <LedgerConnect onConnectLedger={onConfirmationComplete} />,
    );

    const retryButton = getByTestId('add-network-button');
    fireEvent.press(retryButton);

    expect(ledgerLogicToRun).toHaveBeenCalled();
  });
});
