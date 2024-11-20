import React from 'react';
import Scan from './Scan';
import renderWithProvider from '../../../util/test/renderWithProvider';
import useBluetoothDevices from '../../hooks/Ledger/useBluetoothDevices';
import useBluetoothPermissions from '../../hooks/useBluetoothPermissions';
import useBluetooth from '../../hooks/Ledger/useBluetooth';
import { BluetoothPermissionErrors } from '../../../core/Ledger/ledgerErrors';
import { fireEvent } from '@testing-library/react-native';
import { SELECT_DROP_DOWN } from '../../UI/SelectOptionSheet/constants';
import { NavigationProp, ParamListBase,   useNavigation } from '@react-navigation/native';

jest.mock('../../hooks/Ledger/useBluetooth');
jest.mock('../../hooks/Ledger/useBluetoothDevices');
jest.mock('../../hooks/useBluetoothPermissions');

jest.mock('react-native-permissions', () => ({
  openSettings: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
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

  it('calls onValueChange when select different device', () => {
    const device1 = {
      id: 'device1',
      name: 'Device 1',
    };
    const device2 = {
      id: 'device2',
      name: 'Device 2',
    };

    const onDeviceSelected = jest.fn();

    const navigateMock = {
      navigate: jest.fn().mockImplementation(() => {onDeviceSelected(device2);}),
    } as unknown as NavigationProp<ParamListBase>;
    jest.mocked(useNavigation).mockReturnValue(navigateMock);

    jest.mocked(useBluetoothDevices).mockReturnValue({
      devices: [device1, device2],
      deviceScanError: false,
    });

    const {getByTestId} = renderWithProvider(
      <Scan
        onDeviceSelected={onDeviceSelected}
        onScanningErrorStateChanged={jest.fn()}
        ledgerError={undefined}
      />,
    );
    expect(onDeviceSelected).toHaveBeenCalledWith(device1);

    fireEvent.press(getByTestId(SELECT_DROP_DOWN));

    expect(onDeviceSelected).toHaveBeenCalledWith(device2);
  });

});
