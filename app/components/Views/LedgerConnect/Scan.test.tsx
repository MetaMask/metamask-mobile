import React from 'react';
import Scan from './Scan';
import renderWithProvider from '../../../util/test/renderWithProvider';
import useBluetoothDevices from '../../hooks/Ledger/useBluetoothDevices';
import useBluetoothPermissions from '../../hooks/useBluetoothPermissions';
import useBluetooth from '../../hooks/Ledger/useBluetooth';
import { BluetoothPermissionErrors } from '../../../core/Ledger/ledgerErrors';
import { fireEvent } from '@testing-library/react-native';

jest.mock('../../hooks/Ledger/useBluetooth');
jest.mock('../../hooks/Ledger/useBluetoothDevices');
jest.mock('../../hooks/useBluetoothPermissions');

jest.mock('react-native-permissions', () => ({
  openSettings: jest.fn(),
}));

describe('Scan', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock hook return values
    jest.mocked(useBluetoothPermissions).mockReturnValue({
      hasBluetoothPermissions: true,
      bluetoothPermissionError: undefined,
      checkPermissions: jest.fn(),
    });

    jest.mocked(useBluetooth).mockReturnValue({
      bluetoothOn: true,
      bluetoothConnectionError: false,
    });

    jest.mocked(useBluetoothDevices).mockReturnValue({
      devices: [],
      deviceScanError: false,
    });
  });

  it('render matches latest snapshot', () => {
    const container = renderWithProvider(
      <Scan
        onDeviceSelected={jest.fn()}
        onScanningErrorStateChanged={jest.fn()}
        ledgerError={undefined}
      />,
    );

    expect(container).toMatchSnapshot();
  });

  it('calls onDeviceSelected with first device when devices are available', () => {
    const selectedDevice = {
      id: 'device1',
      name: 'Device 1',
    };

    jest.mocked(useBluetoothDevices).mockReturnValue({
      devices: [selectedDevice],
      deviceScanError: false,
    });

    const onDeviceSelected = jest.fn();

    renderWithProvider(
      <Scan
        onDeviceSelected={onDeviceSelected}
        onScanningErrorStateChanged={jest.fn()}
        ledgerError={undefined}
      />,
    );
    expect(onDeviceSelected).toHaveBeenCalledWith(selectedDevice);
  });

  it('calls onScanningErrorStateChanged on bluetoothPermissionError LocationAccessBlocked', () => {
    const onScanningErrorStateChanged = jest.fn();

    jest.mocked(useBluetoothPermissions).mockReturnValue({
      hasBluetoothPermissions: false,
      bluetoothPermissionError: BluetoothPermissionErrors.LocationAccessBlocked,
      checkPermissions: jest.fn(),
    });

    renderWithProvider(
      <Scan
        onDeviceSelected={jest.fn()}
        onScanningErrorStateChanged={onScanningErrorStateChanged}
        ledgerError={undefined}
      />,
    );

    expect(onScanningErrorStateChanged).toHaveBeenCalled();
  });

  it('calls onScanningErrorStateChanged on bluetoothPermissionError BluetoothAccessBlocked', () => {
    const onScanningErrorStateChanged = jest.fn();

    jest.mocked(useBluetoothPermissions).mockReturnValue({
      hasBluetoothPermissions: false,
      bluetoothPermissionError:
        BluetoothPermissionErrors.BluetoothAccessBlocked,
      checkPermissions: jest.fn(),
    });

    renderWithProvider(
      <Scan
        onDeviceSelected={jest.fn()}
        onScanningErrorStateChanged={onScanningErrorStateChanged}
        ledgerError={undefined}
      />,
    );

    expect(onScanningErrorStateChanged).toHaveBeenCalled();
  });

  it('calls onScanningErrorStateChanged on bluetoothPermissionError NearbyDevicesAccessBlocked', () => {
    const onScanningErrorStateChanged = jest.fn();

    jest.mocked(useBluetoothPermissions).mockReturnValue({
      hasBluetoothPermissions: false,
      bluetoothPermissionError:
        BluetoothPermissionErrors.NearbyDevicesAccessBlocked,
      checkPermissions: jest.fn(),
    });

    renderWithProvider(
      <Scan
        onDeviceSelected={jest.fn()}
        onScanningErrorStateChanged={onScanningErrorStateChanged}
        ledgerError={undefined}
      />,
    );

    expect(onScanningErrorStateChanged).toHaveBeenCalled();
  });

  it('calls onScanningErrorStateChanged on bluetoothConnectionError', () => {
    const onScanningErrorStateChanged = jest.fn();

    jest.mocked(useBluetooth).mockReturnValue({
      bluetoothOn: true,
      bluetoothConnectionError: true,
    });

    renderWithProvider(
      <Scan
        onDeviceSelected={jest.fn()}
        onScanningErrorStateChanged={onScanningErrorStateChanged}
        ledgerError={undefined}
      />,
    );

    expect(onScanningErrorStateChanged).toHaveBeenCalled();
  });

  it('calls onScanningErrorStateChanged on deviceScanError', () => {
    const onScanningErrorStateChanged = jest.fn();

    jest.mocked(useBluetoothDevices).mockReturnValue({
      devices: [],
      deviceScanError: true,
    });

    renderWithProvider(
      <Scan
        onDeviceSelected={jest.fn()}
        onScanningErrorStateChanged={onScanningErrorStateChanged}
        ledgerError={undefined}
      />,
    );

    expect(onScanningErrorStateChanged).toHaveBeenCalled();
  });

  it('calls onDeviceSelected when user selects a Ledger device', () => {
    const onDeviceSelected = jest.fn();
    jest.mocked(useBluetoothDevices).mockReturnValue({
      devices: [
        { id: 'device1', name: 'Device 1' },
        { id: 'device2', name: 'Device 2' },
        { id: 'device3', name: 'Device 3' },
      ],
      deviceScanError: true,
    });

    const { getByText } = renderWithProvider(
      <Scan
        onDeviceSelected={onDeviceSelected}
        onScanningErrorStateChanged={jest.fn()}
        ledgerError={undefined}
      />,
    );

    const selectedItem = getByText('Device 1');
    fireEvent.press(selectedItem);

    expect(onDeviceSelected).toHaveBeenNthCalledWith(1, {
      id: 'device1',
      name: 'Device 1',
    });
  });
});
