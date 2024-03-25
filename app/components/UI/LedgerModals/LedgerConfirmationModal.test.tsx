import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import LedgerConfirmationModal from './LedgerConfirmationModal';
import useLedgerBluetooth from '../../hooks/Ledger/useLedgerBluetooth';
import {
  ERROR_STEP,
  OPEN_ETH_APP_STEP,
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

jest.mock('../../../core/Ledger/Ledger', () => ({
  unlockLedgerDefaultAccount: jest.fn(),
}));

jest.mock('../../hooks/Ledger/useLedgerBluetooth', () =>
  jest.fn().mockReturnValue({
    isSendingLedgerCommands: false,
    isAppLaunchConfirmationNeeded: false,
    ledgerLogicToRun: jest.fn(),
    error: null,
  }),
);

jest.mock('../../hooks/Ledger/useBluetooth', () =>
  jest.fn().mockReturnValue({
    bluetoothOn: true,
    bluetoothConnectionError: null,
  }),
);

jest.mock('../../../components/hooks/useBluetoothPermissions', () =>
  jest.fn().mockReturnValue({
    hasBluetoothPermissions: true,
    bluetoothPermissionError: null,
    checkPermissions: jest.fn(),
    BluetoothPermissionErrors: jest.requireActual(
      '../../../components/hooks/useBluetoothPermissions',
    ).BluetoothPermissionErrors,
  }),
);

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: jest.fn().mockReturnValue({
    trackEvent: jest.fn(),
  }),
}));

const mockedNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockedNavigate,
  }),
}));

describe('LedgerConfirmationModal', () => {
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

  // afterEach(() => {
  //   jest.clearAllMocks();
  // });

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

  it('renders ErrorStep when there is a ledger communication error', async () => {
    useLedgerBluetooth.mockReturnValue({
      isSendingLedgerCommands: true,
      isAppLaunchConfirmationNeeded: false,
      ledgerLogicToRun: jest.fn(),
      error: LedgerCommunicationErrors.FailedToOpenApp,
    });

    const { getByTestId } = renderWithProvider(
      <LedgerConfirmationModal
        onConfirmation={jest.fn()}
        onRejection={jest.fn()}
        deviceId={'test'}
      />,
    );

    expect(getByTestId(ERROR_STEP)).toBeTruthy();
  });

  it('renders ErrorStep when there is a bluetooth permission error', () => {
    useBluetoothPermissions.mockReturnValue({
      hasBluetoothPermissions: false,
      bluetoothPermissionError: BluetoothPermissionErrors.LocationAccessBlocked,
      checkPermissions: jest.fn(),
    });

    const { getByTestId } = renderWithProvider(
      <LedgerConfirmationModal
        onConfirmation={jest.fn()}
        onRejection={jest.fn()}
        deviceId={'test'}
      />,
    );
    expect(getByTestId(ERROR_STEP)).toBeTruthy();
  });

  it('renders ErrorStep when there is a bluetooth connection error', () => {
    useBluetooth.mockReturnValue({
      bluetoothOn: false,
      bluetoothConnectionError: true,
    });

    const { getByTestId } = renderWithProvider(
      <LedgerConfirmationModal
        onConfirmation={jest.fn()}
        onRejection={jest.fn()}
        deviceId={'test'}
      />,
    );
    expect(getByTestId(ERROR_STEP)).toBeTruthy();
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
