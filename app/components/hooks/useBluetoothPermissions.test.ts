import { act, renderHook } from '@testing-library/react-hooks';
import {
  PERMISSIONS,
  request,
  requestMultiple,
  RESULTS,
} from 'react-native-permissions';
import useBluetoothPermissions from './useBluetoothPermissions';
import Device from '../../util/device';
import { BluetoothPermissionErrors } from '../../core/Ledger/ledgerErrors';

import { getSystemVersion } from 'react-native-device-info';
import { AppState } from 'react-native';

jest.mock('react-native/Libraries/AppState/AppState', () => ({
  currentState: 'active',
  addEventListener: jest.fn(),
}));

jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    IOS: {
      BLUETOOTH_PERIPHERAL: 'iosBluetooth',
    },
    ANDROID: {
      ACCESS_FINE_LOCATION: 'androidLocation',
      BLUETOOTH_CONNECT: 'androidBluetoothConnect',
      BLUETOOTH_SCAN: 'androidBluetoothScan',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
  },
  request: jest.fn(),
  requestMultiple: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  getSystemVersion: jest.fn(),
}));

jest.mock('../../util/device', () => ({
  isIos: jest.fn(),
  isAndroid: jest.fn(),
}));

describe('useBluetoothPermissions', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('grants permissions on iOS', async () => {
    Device.isIos.mockReturnValue(true);
    request.mockResolvedValue(RESULTS.GRANTED);

    const { result, waitForNextUpdate } = renderHook(() =>
      useBluetoothPermissions(),
    );
    await waitForNextUpdate();

    expect(result.current.hasBluetoothPermissions).toBe(true);
    expect(result.current.bluetoothPermissionError).toBeUndefined();
  });

  it('denies permissions on iOS', async () => {
    Device.isIos.mockReturnValue(true);
    request.mockResolvedValue(RESULTS.DENIED);

    const { result, waitForNextUpdate } = renderHook(() =>
      useBluetoothPermissions(),
    );
    await waitForNextUpdate();

    expect(result.current.hasBluetoothPermissions).toBe(false);
    expect(result.current.bluetoothPermissionError).toBe(
      BluetoothPermissionErrors.BluetoothAccessBlocked,
    );
  });

  it('grants permissions on Android 12+', async () => {
    Device.isAndroid.mockReturnValue(true);
    getSystemVersion.mockReturnValue('12');
    requestMultiple.mockResolvedValue({
      [PERMISSIONS.ANDROID.BLUETOOTH_CONNECT]: RESULTS.GRANTED,
      [PERMISSIONS.ANDROID.BLUETOOTH_SCAN]: RESULTS.GRANTED,
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useBluetoothPermissions(),
    );
    await waitForNextUpdate();

    expect(result.current.hasBluetoothPermissions).toBe(true);
    expect(result.current.bluetoothPermissionError).toBeUndefined();
  });

  it('denies permissions on Android 12+', async () => {
    Device.isAndroid.mockReturnValue(true);
    getSystemVersion.mockReturnValue('12');
    requestMultiple.mockResolvedValue({
      [PERMISSIONS.ANDROID.BLUETOOTH_CONNECT]: RESULTS.DENIED,
      [PERMISSIONS.ANDROID.BLUETOOTH_SCAN]: RESULTS.DENIED,
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useBluetoothPermissions(),
    );
    await waitForNextUpdate();

    expect(result.current.hasBluetoothPermissions).toBe(false);
    expect(result.current.bluetoothPermissionError).toBe(
      BluetoothPermissionErrors.NearbyDevicesAccessBlocked,
    );
  });

  it('grants permissions on Android <12', async () => {
    Device.isAndroid.mockReturnValue(true);
    getSystemVersion.mockReturnValue('11');
    request.mockResolvedValue(RESULTS.GRANTED);

    const { result, waitForNextUpdate } = renderHook(() =>
      useBluetoothPermissions(),
    );
    await waitForNextUpdate();

    expect(result.current.hasBluetoothPermissions).toBe(true);
    expect(result.current.bluetoothPermissionError).toBeUndefined();
  });

  it('denies permissions on Android <12', async () => {
    Device.isAndroid.mockReturnValue(true);
    getSystemVersion.mockReturnValue('11');
    request.mockResolvedValue(RESULTS.DENIED);

    const { result, waitForNextUpdate } = renderHook(() =>
      useBluetoothPermissions(),
    );
    await waitForNextUpdate();

    expect(result.current.hasBluetoothPermissions).toBe(false);
    expect(result.current.bluetoothPermissionError).toBe(
      BluetoothPermissionErrors.LocationAccessBlocked,
    );
  });

  it('checks permissions when app state changes to active', async () => {
    Device.isAndroid.mockReturnValue(true);
    getSystemVersion.mockReturnValue('12');
    requestMultiple.mockResolvedValue({
      [PERMISSIONS.ANDROID.BLUETOOTH_CONNECT]: RESULTS.GRANTED,
      [PERMISSIONS.ANDROID.BLUETOOTH_SCAN]: RESULTS.GRANTED,
    });

    AppState.currentState = 'background';
    renderHook(() => useBluetoothPermissions());
    //checkPermission run once when hook is mounted
    expect(requestMultiple).toHaveBeenCalledTimes(1);

    act(() => {
      AppState.addEventListener.mock.calls[0][1]('active');
    });

    //checkPermission run again when app state changes to active
    expect(requestMultiple).toHaveBeenCalledTimes(2);
  });

  it('does not check permissions when app state changes to background', async () => {
    Device.isAndroid.mockReturnValue(true);
    getSystemVersion.mockReturnValue('12');
    requestMultiple.mockResolvedValue({
      [PERMISSIONS.ANDROID.BLUETOOTH_CONNECT]: RESULTS.GRANTED,
      [PERMISSIONS.ANDROID.BLUETOOTH_SCAN]: RESULTS.GRANTED,
    });

    AppState.currentState = 'background';
    renderHook(() => useBluetoothPermissions());
    //checkPermission run once when hook is mounted
    expect(requestMultiple).toHaveBeenCalledTimes(1);

    act(() => {
      AppState.addEventListener.mock.calls[0][1]('inactive');
    });

    //checkPermission does not run when app state changes to inactive
    expect(requestMultiple).toHaveBeenCalledTimes(1);
  });

  it('grants permissions when getSystemVersion is null', async () => {
    Device.isAndroid.mockReturnValue(true);
    getSystemVersion.mockReturnValue(null);
    request.mockResolvedValue(RESULTS.GRANTED);

    const { result, waitForNextUpdate } = renderHook(() =>
      useBluetoothPermissions(),
    );
    await waitForNextUpdate();

    expect(result.current.hasBluetoothPermissions).toBe(true);
    expect(result.current.bluetoothPermissionError).toBeUndefined();
  });

  it('grants permissions when getSystemVersion return is not a number', async () => {
    Device.isAndroid.mockReturnValue(true);
    getSystemVersion.mockReturnValue('adbd');
    request.mockResolvedValue(RESULTS.GRANTED);

    const { result, waitForNextUpdate } = renderHook(() =>
      useBluetoothPermissions(),
    );
    await waitForNextUpdate();

    expect(result.current.hasBluetoothPermissions).toBe(true);
    expect(result.current.bluetoothPermissionError).toBeUndefined();
  });
});
