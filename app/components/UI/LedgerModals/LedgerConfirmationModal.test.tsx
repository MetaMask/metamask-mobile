import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import LedgerConfirmationModal from './LedgerConfirmationModal';
import useLedgerBluetooth from '../../hooks/Ledger/useLedgerBluetooth';
import {
  ERROR_STEP,
  OPEN_ETH_APP_STEP,
  RETRY_BUTTON,
  SEARCHING_FOR_DEVICE_STEP,
} from './Steps/Steps.constants';
import useBluetoothPermissions from '../../hooks/useBluetoothPermissions';
import useBluetooth from '../../hooks/Ledger/useBluetooth';
import { act } from '@testing-library/react-hooks';
import {
  BluetoothPermissionErrors,
  LedgerCommunicationErrors,
} from '../../../core/Ledger/ledgerErrors';
import { unlockLedgerDefaultAccount } from '../../../core/Ledger/Ledger';
import { strings } from '../../../../locales/i18n';
import { useMetrics } from '../../hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { fireEvent } from '@testing-library/react-native';

jest.mock('../../../core/Ledger/Ledger', () => ({
  unlockLedgerDefaultAccount: jest.fn(),
}));

jest.mock('../../hooks/Ledger/useBluetooth', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/Ledger/useLedgerBluetooth', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../components/hooks/useBluetoothPermissions', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
}));

describe('LedgerConfirmationModal', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    //mock hook return value
    useBluetoothPermissions.mockReturnValue({
      hasBluetoothPermissions: true,
      bluetoothPermissionError: null,
      checkPermissions: jest.fn(),
    });

    useBluetooth.mockReturnValue({
      bluetoothOn: true,
      bluetoothConnectionError: false,
    });

    useLedgerBluetooth.mockReturnValue({
      isSendingLedgerCommands: false,
      isAppLaunchConfirmationNeeded: false,
      ledgerLogicToRun: jest.fn(),
      error: null,
    });

    useMetrics.mockReturnValue({
      trackEvent: jest.fn(),
    });
  });

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

    const { getByTestId, getByText } = renderWithProvider(
      <LedgerConfirmationModal
        onConfirmation={jest.fn()}
        onRejection={jest.fn()}
        deviceId={'test'}
      />,
    );

    expect(getByTestId(ERROR_STEP)).toBeTruthy();
    expect(getByText(expectedTitle)).toBeTruthy();
    expect(getByText(expectedErrorBody)).toBeTruthy();
  };

  const checkBluetoothPermissionErrorFlow = function (
    bluetoothPermissionError: BluetoothPermissionErrors,
    expectedTitle: string,
    expectedErrorBody: string,
  ) {
    useBluetoothPermissions.mockReturnValue({
      hasBluetoothPermissions: false,
      bluetoothPermissionError,
      checkPermissions: jest.fn(),
    });

    const { getByTestId, getByText } = renderWithProvider(
      <LedgerConfirmationModal
        onConfirmation={jest.fn()}
        onRejection={jest.fn()}
        deviceId={'test'}
      />,
    );
    expect(getByTestId(ERROR_STEP)).toBeTruthy();
    expect(getByText(expectedTitle)).toBeTruthy();
    expect(getByText(expectedErrorBody)).toBeTruthy();
  };

  it('render matches latest snapshot', () => {
    const { toJSON } = renderWithProvider(
      <LedgerConfirmationModal
        onConfirmation={jest.fn()}
        onRejection={jest.fn()}
        deviceId={'test'}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders SearchingForDeviceStep when not sending ledger commands', () => {
    const { getByTestId } = renderWithProvider(
      <LedgerConfirmationModal
        onConfirmation={jest.fn()}
        onRejection={jest.fn()}
        deviceId={'test'}
      />,
    );
    expect(getByTestId(SEARCHING_FOR_DEVICE_STEP)).toBeTruthy();
  });

  it('renders OpenETHAppStep when app launch confirmation is needed', () => {
    useLedgerBluetooth.mockReturnValue({
      isSendingLedgerCommands: true,
      isAppLaunchConfirmationNeeded: true,
      ledgerLogicToRun: jest.fn(),
      error: null,
    });

    const { getByTestId } = renderWithProvider(
      <LedgerConfirmationModal
        onConfirmation={jest.fn()}
        onRejection={jest.fn()}
        deviceId={'test'}
      />,
    );
    expect(getByTestId(OPEN_ETH_APP_STEP)).toBeTruthy();
  });

  it('renders ErrorStep when there is a ledger FailedToOpenApp  error', async () => {
    checkLedgerCommunicationErrorFlow(
      LedgerCommunicationErrors.FailedToOpenApp,
      strings('ledger.failed_to_open_eth_app'),
      strings('ledger.ethereum_app_open_error'),
    );
  });

  it('renders ErrorStep when there is a ledger FailedToCloseApp error', async () => {
    checkLedgerCommunicationErrorFlow(
      LedgerCommunicationErrors.FailedToCloseApp,
      strings('ledger.running_app_close'),
      strings('ledger.running_app_close_error'),
    );
  });

  it('renders ErrorStep when there is a ledger AppIsNotInstalled error', async () => {
    checkLedgerCommunicationErrorFlow(
      LedgerCommunicationErrors.AppIsNotInstalled,
      strings('ledger.ethereum_app_not_installed'),
      strings('ledger.ethereum_app_not_installed_error'),
    );
  });

  it('renders ErrorStep when there is a ledger LedgerIsLocked error', async () => {
    checkLedgerCommunicationErrorFlow(
      LedgerCommunicationErrors.LedgerIsLocked,
      strings('ledger.ledger_is_locked'),
      strings('ledger.unlock_ledger_message'),
    );
  });

  it('renders ErrorStep when there is a ledger LedgerHasPendingConfirmation error', async () => {
    checkLedgerCommunicationErrorFlow(
      LedgerCommunicationErrors.LedgerHasPendingConfirmation,
      strings('ledger.ledger_pending_confirmation'),
      strings('ledger.ledger_pending_confirmation_error'),
    );
  });

  it('renders ErrorStep when there is a ledger NotSupported error', async () => {
    checkLedgerCommunicationErrorFlow(
      LedgerCommunicationErrors.NotSupported,
      strings('ledger.not_supported'),
      strings('ledger.not_supported_error'),
    );
  });

  it('renders ErrorStep when there is a ledger UnknownError error', async () => {
    checkLedgerCommunicationErrorFlow(
      LedgerCommunicationErrors.UnknownError,
      strings('ledger.unknown_error'),
      strings('ledger.unknown_error_message'),
    );
  });

  it('renders ErrorStep when there is a ledger NonceTooLow error', async () => {
    checkLedgerCommunicationErrorFlow(
      LedgerCommunicationErrors.NonceTooLow,
      strings('ledger.nonce_too_low'),
      strings('ledger.nonce_too_low_error'),
    );
  });

  it('renders ErrorStep when there is a ledger LedgerDisconnected error', async () => {
    checkLedgerCommunicationErrorFlow(
      LedgerCommunicationErrors.LedgerDisconnected,
      strings('ledger.ledger_disconnected'),
      strings('ledger.ledger_disconnected_error'),
    );
  });

  it('renders ErrorStep when there is a bluetooth LocationAccessBlocked error', () => {
    checkBluetoothPermissionErrorFlow(
      BluetoothPermissionErrors.LocationAccessBlocked,
      strings('ledger.location_access_blocked'),
      strings('ledger.location_access_blocked_error'),
    );
  });

  it('renders ErrorStep when there is a bluetooth NearbyDevicesAccessBlocked error', () => {
    checkBluetoothPermissionErrorFlow(
      BluetoothPermissionErrors.NearbyDevicesAccessBlocked,
      strings('ledger.nearbyDevices_access_blocked'),
      strings('ledger.nearbyDevices_access_blocked_message'),
    );
  });

  it('renders ErrorStep when there is a bluetooth BluetoothAccessBlocked error', () => {
    checkBluetoothPermissionErrorFlow(
      BluetoothPermissionErrors.BluetoothAccessBlocked,
      strings('ledger.bluetooth_access_blocked'),
      strings('ledger.bluetooth_access_blocked_message'),
    );
  });

  it('renders ErrorStep when there is a bluetooth connection error', () => {
    useBluetooth.mockReturnValue({
      bluetoothOn: false,
      bluetoothConnectionError: true,
    });

    const { getByTestId, getByText } = renderWithProvider(
      <LedgerConfirmationModal
        onConfirmation={jest.fn()}
        onRejection={jest.fn()}
        deviceId={'test'}
      />,
    );
    expect(getByTestId(ERROR_STEP)).toBeTruthy();
    expect(getByText(strings('ledger.bluetooth_off'))).toBeTruthy();
    expect(getByText(strings('ledger.bluetooth_off_message'))).toBeTruthy();
  });

  it('retries connectLedger when retry button is used', async () => {
    const ledgerLogicToRun = jest.fn();

    useLedgerBluetooth.mockReturnValue({
      isSendingLedgerCommands: true,
      isAppLaunchConfirmationNeeded: false,
      ledgerLogicToRun,
      error: LedgerCommunicationErrors.FailedToOpenApp,
    });

    const { getByTestId } = renderWithProvider(
      <LedgerConfirmationModal
        onConfirmation={jest.fn()}
        onRejection={jest.fn()}
        deviceId={'test'}
      />,
    );

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    await act(async () => {});

    expect(ledgerLogicToRun).toHaveBeenCalledTimes(1);

    const retryButton = getByTestId(RETRY_BUTTON);
    fireEvent.press(retryButton);

    //Retry will run connectLedger again
    expect(ledgerLogicToRun).toHaveBeenCalledTimes(2);
  });

  it('retries checkPermissions when retry button is used', async () => {
    const checkPermissions = jest.fn();
    useBluetoothPermissions.mockReturnValue({
      hasBluetoothPermissions: false,
      bluetoothPermissionError:
        BluetoothPermissionErrors.NearbyDevicesAccessBlocked,
      checkPermissions,
    });

    const { getByTestId } = renderWithProvider(
      <LedgerConfirmationModal
        onConfirmation={jest.fn()}
        onRejection={jest.fn()}
        deviceId={'test'}
      />,
    );

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    await act(async () => {});

    const retryButton = getByTestId(RETRY_BUTTON);
    fireEvent.press(retryButton);

    //Retry will run connectLedger again
    expect(checkPermissions).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirmation when ledger commands are being sent and confirmed have been received.', async () => {
    const onConfirmation = jest.fn();
    unlockLedgerDefaultAccount.mockReturnValue(Promise.resolve(true));
    useLedgerBluetooth.mockReturnValue({
      isSendingLedgerCommands: true,
      isAppLaunchConfirmationNeeded: false,
      ledgerLogicToRun: jest.fn().mockImplementation((callback) => callback()),
      error: null,
    });

    renderWithProvider(
      <LedgerConfirmationModal
        onConfirmation={onConfirmation}
        onRejection={jest.fn()}
        deviceId={'test'}
      />,
    );

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    await act(async () => {});

    expect(unlockLedgerDefaultAccount).toHaveBeenCalled();
    expect(onConfirmation).toHaveBeenCalled();
  });

  it('logs LEDGER_HARDWARE_WALLET_ERROR thrown by unlockLedgerDefaultAccount', async () => {
    const onConfirmation = jest.fn();

    const ledgerLogicToRun = jest.fn();
    useLedgerBluetooth.mockReturnValue({
      isSendingLedgerCommands: true,
      isAppLaunchConfirmationNeeded: false,
      ledgerLogicToRun,
      error: null,
    });

    ledgerLogicToRun.mockImplementation(() => {
      throw new Error('error');
    });

    const trackEvent = jest.fn();
    useMetrics.mockReturnValue({
      trackEvent,
    });

    renderWithProvider(
      <LedgerConfirmationModal
        onConfirmation={onConfirmation}
        onRejection={jest.fn()}
        deviceId={'test'}
      />,
    );

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    await act(async () => {});

    expect(onConfirmation).not.toHaveBeenCalled();

    expect(trackEvent).toHaveBeenNthCalledWith(
      1,
      MetaMetricsEvents.LEDGER_HARDWARE_WALLET_ERROR,
      {
        device_type: 'Ledger',
        error: 'LEDGER_ETH_APP_NOT_INSTALLED',
      },
    );
  });

  it('calls onRejection when user refuses confirmation', async () => {
    const onRejection = jest.fn();
    useLedgerBluetooth.mockReturnValue({
      isSendingLedgerCommands: true,
      isAppLaunchConfirmationNeeded: false,
      ledgerLogicToRun: jest.fn(),
      error: LedgerCommunicationErrors.UserRefusedConfirmation,
    });

    renderWithProvider(
      <LedgerConfirmationModal
        onConfirmation={jest.fn()}
        onRejection={onRejection}
        deviceId={'test'}
      />,
    );
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    await act(async () => {});

    expect(onRejection).toHaveBeenCalled();
  });
});
