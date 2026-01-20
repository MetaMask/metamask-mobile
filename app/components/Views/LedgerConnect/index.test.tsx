import React from 'react';
import LedgerConnect from '.';
import renderWithProvider from '../../../util/test/renderWithProvider';
import useBluetoothPermissions from '../../hooks/useBluetoothPermissions';
import useBluetooth from '../../hooks/Ledger/useBluetooth';
import useBluetoothDevices, {
  BluetoothDevice,
} from '../../hooks/Ledger/useBluetoothDevices';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootParamList } from '../../../types/navigation';
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

jest.mock('../../../core/Ledger/Ledger', () => ({
  ...jest.requireActual('../../../core/Ledger/Ledger'),
  getDeviceId: jest.fn().mockResolvedValue('device-id'),
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

jest.mock('react-native-permissions', () => ({
  openSettings: jest.fn(),
}));

describe('LedgerConnect', () => {
  let isSendingLedgerCommands = false;
  let isAppLaunchConfirmationNeeded = false;

  const onConfirmationComplete = jest.fn();
  const ledgerLogicToRun = jest.fn();
  const selectedDevice: BluetoothDevice = {
    id: '1',
    name: 'Ledger device',
    serviceUUIDs: ['service1'],
  };
  const setSelectedDevice = jest.fn();

  const checkLedgerCommunicationErrorFlow = function (
    ledgerCommunicationError: LedgerCommunicationErrors,
    expectedTitle: string,
    expectedErrorBody: string,
  ) {
    const { getByText } = renderWithProvider(
      <LedgerConnect
        onConnectLedger={onConfirmationComplete}
        isSendingLedgerCommands={isSendingLedgerCommands}
        isAppLaunchConfirmationNeeded={isAppLaunchConfirmationNeeded}
        ledgerLogicToRun={ledgerLogicToRun}
        ledgerError={ledgerCommunicationError}
        selectedDevice={selectedDevice}
        setSelectedDevice={setSelectedDevice}
      />,
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
      devices: [{ id: '1', name: 'Ledger device', serviceUUIDs: ['service1'] }],
      deviceScanError: false,
    });

    (
      useNavigation as jest.MockedFunction<typeof useNavigation>
    ).mockReturnValue({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      dispatch: jest.fn(),
    } as unknown as NavigationProp<RootParamList>);

    jest.mocked(getSystemVersion).mockReturnValue('13');
    jest.mocked(Device.isAndroid).mockReturnValue(true);
    jest.mocked(Device.isIos).mockReturnValue(false);
    jest.mocked(Device.isIphoneX).mockReturnValue(false);
    jest.mocked(Device.getDeviceWidth).mockReturnValue(50);
    jest.mocked(Device.getDeviceHeight).mockReturnValue(50);
  });

  it('render matches latest snapshot', () => {
    const wrapper = renderWithProvider(
      <LedgerConnect
        onConnectLedger={onConfirmationComplete}
        isSendingLedgerCommands={isSendingLedgerCommands}
        isAppLaunchConfirmationNeeded={isAppLaunchConfirmationNeeded}
        ledgerLogicToRun={ledgerLogicToRun}
        ledgerError={undefined}
        selectedDevice={selectedDevice}
        setSelectedDevice={setSelectedDevice}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('calls connectLedger when continue button is pressed', () => {
    isSendingLedgerCommands = false;
    isAppLaunchConfirmationNeeded = false;

    ledgerLogicToRun.mockImplementation((callback: () => void) => callback());

    const { getByTestId } = renderWithProvider(
      <LedgerConnect
        onConnectLedger={onConfirmationComplete}
        isSendingLedgerCommands={isSendingLedgerCommands}
        isAppLaunchConfirmationNeeded={isAppLaunchConfirmationNeeded}
        ledgerLogicToRun={ledgerLogicToRun}
        ledgerError={undefined}
        selectedDevice={selectedDevice}
        setSelectedDevice={setSelectedDevice}
      />,
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
    } as unknown as NavigationProp<RootParamList>);

    isSendingLedgerCommands = true;
    isAppLaunchConfirmationNeeded = false;

    renderWithProvider(
      <LedgerConnect
        onConnectLedger={onConfirmationComplete}
        isSendingLedgerCommands={isSendingLedgerCommands}
        isAppLaunchConfirmationNeeded={isAppLaunchConfirmationNeeded}
        ledgerLogicToRun={ledgerLogicToRun}
        ledgerError={LedgerCommunicationErrors.LedgerHasPendingConfirmation}
        selectedDevice={selectedDevice}
        setSelectedDevice={setSelectedDevice}
      />,
    );

    expect(navigate).toHaveBeenNthCalledWith(1, 'SelectHardwareWallet');
  });

  it('displays android 12+ permission text on android 12+ device', () => {
    jest.mocked(getSystemVersion).mockReturnValue('13');
    const { getByText } = renderWithProvider(
      <LedgerConnect
        onConnectLedger={onConfirmationComplete}
        isSendingLedgerCommands={isSendingLedgerCommands}
        isAppLaunchConfirmationNeeded={isAppLaunchConfirmationNeeded}
        ledgerLogicToRun={ledgerLogicToRun}
        ledgerError={undefined}
        selectedDevice={selectedDevice}
        setSelectedDevice={setSelectedDevice}
      />,
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
      <LedgerConnect
        onConnectLedger={onConfirmationComplete}
        isSendingLedgerCommands={isSendingLedgerCommands}
        isAppLaunchConfirmationNeeded={isAppLaunchConfirmationNeeded}
        ledgerLogicToRun={ledgerLogicToRun}
        ledgerError={undefined}
        selectedDevice={selectedDevice}
        setSelectedDevice={setSelectedDevice}
      />,
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
      <LedgerConnect
        onConnectLedger={onConfirmationComplete}
        isSendingLedgerCommands={isSendingLedgerCommands}
        isAppLaunchConfirmationNeeded={isAppLaunchConfirmationNeeded}
        ledgerLogicToRun={ledgerLogicToRun}
        ledgerError={undefined}
        selectedDevice={selectedDevice}
        setSelectedDevice={setSelectedDevice}
      />,
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
    isSendingLedgerCommands = true;
    isAppLaunchConfirmationNeeded = false;

    const { getByTestId } = renderWithProvider(
      <LedgerConnect
        onConnectLedger={onConfirmationComplete}
        isSendingLedgerCommands={isSendingLedgerCommands}
        isAppLaunchConfirmationNeeded={isAppLaunchConfirmationNeeded}
        ledgerLogicToRun={ledgerLogicToRun}
        ledgerError={LedgerCommunicationErrors.FailedToOpenApp}
        selectedDevice={selectedDevice}
        setSelectedDevice={setSelectedDevice}
      />,
    );

    const retryButton = getByTestId('add-network-button');
    fireEvent.press(retryButton);

    expect(ledgerLogicToRun).toHaveBeenCalled();
  });

  it('shows error message about multiple devices support', async () => {
    isSendingLedgerCommands = true;
    isAppLaunchConfirmationNeeded = false;
    const { getByTestId } = renderWithProvider(
      <LedgerConnect
        onConnectLedger={onConfirmationComplete}
        isSendingLedgerCommands={isSendingLedgerCommands}
        isAppLaunchConfirmationNeeded={isAppLaunchConfirmationNeeded}
        ledgerLogicToRun={ledgerLogicToRun}
        ledgerError={undefined}
        selectedDevice={selectedDevice}
        setSelectedDevice={setSelectedDevice}
      />,
    );
    await waitFor(() => {
      expect(getByTestId('multiple-devices-error-message')).toBeDefined();
    });
  });
});
