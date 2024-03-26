import React from 'react';
import Scan from './Scan';
import renderWithProvider from '../../../util/test/renderWithProvider';
import useBluetoothDevices from '../../hooks/Ledger/useBluetoothDevices';
import useBluetoothPermissions from '../../hooks/useBluetoothPermissions';
import useBluetooth from '../../hooks/Ledger/useBluetooth';
import { BluetoothPermissionErrors } from '../../../core/Ledger/ledgerErrors';
import { fireEvent } from '@testing-library/react-native';

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

jest.mock('react-native-permissions', () => ({
  openSettings: jest.fn(),
}));

describe('Scan', () => {
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
      devices: [],
      deviceScanError: false,
    });
  });

  it('should render correctly', () => {
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
      value: 'device1',
    };

    useBluetoothDevices.mockImplementation(() => ({
      devices: [selectedDevice],
      deviceScanError: false,
    }));

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

  it('should call onScanningErrorStateChanged when bluetoothPermissionError LocationAccessBlocked occur', () => {
    const onScanningErrorStateChanged = jest.fn();

    useBluetoothPermissions.mockReturnValue({
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

  it('should call onScanningErrorStateChanged when bluetoothPermissionError BluetoothAccessBlocked occur', () => {
    const onScanningErrorStateChanged = jest.fn();

    useBluetoothPermissions.mockReturnValue({
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

  it('should call onScanningErrorStateChanged when bluetoothPermissionError NearbyDevicesAccessBlocked occur', () => {
    const onScanningErrorStateChanged = jest.fn();

    useBluetoothPermissions.mockReturnValue({
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

  it('should call onScanningErrorStateChanged when bluetoothConnectionError occur', () => {
    const onScanningErrorStateChanged = jest.fn();

    useBluetooth.mockReturnValue({
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

  it('should call onScanningErrorStateChanged when deviceScanError occur', () => {
    const onScanningErrorStateChanged = jest.fn();

    useBluetoothDevices.mockReturnValue({
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

  it('should call onDeviceSelected when user select a device from the list', () => {
    const onDeviceSelected = jest.fn();
    useBluetoothDevices.mockReturnValue({
      devices: [
        { id: 'device1', name: 'Device 1', value: 'device1' },
        { id: 'device2', name: 'device 2', value: 'device2' },
        { id: 'device3', name: 'device 3', value: 'device3' },
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
      value: 'device1',
    });
  });
});
