import { renderHook } from '@testing-library/react-hooks';
import useBluetoothDevices from './useBluetoothDevices';

jest.mock('@ledgerhq/react-native-hw-transport-ble', () => ({
  listen: jest.fn(),
}));

describe('useBluetoothDevices', () => {
  it('returns empty devices and no error when permissions are false', () => {
    const { result } = renderHook(() => useBluetoothDevices(false, true));

    expect(result.current.devices).toEqual([]);
    expect(result.current.deviceScanError).toBe(false);
  });

  it('returns empty devices and no error when bluetooth is off', () => {
    const { result } = renderHook(() => useBluetoothDevices(true, false));

    expect(result.current.devices).toEqual([]);
    expect(result.current.deviceScanError).toBe(false);
  });
});
