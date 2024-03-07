import { renderHook } from '@testing-library/react-hooks';
import useBluetooth from './useBluetooth';

describe('useBluetooth', () => {
  it('should return bluetoothOn as false and bluetoothConnectionError as undefined when hasBluetoothPermissions is false', () => {
    const { result } = renderHook(() => useBluetooth(false));

    expect(result.current.bluetoothOn).toBe(false);
    expect(result.current.bluetoothConnectionError).toBeUndefined();
  });
});
