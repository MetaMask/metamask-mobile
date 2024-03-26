import React from 'react';
import Scan from './Scan';
import renderWithProvider from '../../../util/test/renderWithProvider';
import useBluetoothDevices from '../../hooks/Ledger/useBluetoothDevices';
import useBluetoothPermissions from '../../hooks/useBluetoothPermissions';
import useBluetooth from '../../hooks/Ledger/useBluetooth';

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
      error: undefined,
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
    const selectedDevice = { id: 'device1', name: 'Device 1' };

    useBluetoothDevices.mockImplementation(() => ({
      devices: [selectedDevice],
      error: undefined,
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
});
