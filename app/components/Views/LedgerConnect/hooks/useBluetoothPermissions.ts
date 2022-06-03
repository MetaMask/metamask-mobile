import { useState, useRef, useLayoutEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { check, PERMISSIONS, RESULTS, request } from 'react-native-permissions';
import Device from '../../../../util/device';

export enum BluetoothPermissionErrors {
  BluetoothAccessBlocked = 'BluetoothAccessBlocked',
  LocationAccessBlocked = 'LocationAccessBlocked',
}

const useBluetoothPermissions = () => {
  const appState = useRef(AppState.currentState);
  const [hasBluetoothPermissions, setHasBluetoothPermissions] =
    useState<boolean>(false);
  const [bluetoothPermissionError, setBluetoothPermissionError] =
    useState<BluetoothPermissionErrors>();

  // Checking if app has required permissions every time the app becomes active
  const checkPermissions = async () => {
    setBluetoothPermissionError(undefined);

    if (Device.isIos()) {
      const bluetoothPermissionStatus = await check(
        PERMISSIONS.IOS.BLUETOOTH_PERIPHERAL,
      );
      const bluetoothAllowed = bluetoothPermissionStatus === RESULTS.GRANTED;
      if (bluetoothAllowed) {
        setHasBluetoothPermissions(true);
      } else {
        setBluetoothPermissionError(
          BluetoothPermissionErrors.BluetoothAccessBlocked,
        );
      }
    }

    if (Device.isAndroid()) {
      const bluetoothPermissionStatus = await request(
        PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      );
      const bluetoothAllowed = bluetoothPermissionStatus === RESULTS.GRANTED;

      if (bluetoothAllowed) {
        setHasBluetoothPermissions(true);
      } else {
        setBluetoothPermissionError(
          BluetoothPermissionErrors.LocationAccessBlocked,
        );
      }
    }
  };

  // External permission changes must be picked up by the app by tracking the app state
  useLayoutEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        setBluetoothPermissionError(undefined);
        checkPermissions();
      }

      appState.current = nextAppState;
    };

    AppState.addEventListener('change', handleAppStateChange);
    checkPermissions();
    return () => {
      AppState.removeEventListener('change', handleAppStateChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    hasBluetoothPermissions,
    bluetoothPermissionError,
    checkPermissions,
  };
};

export default useBluetoothPermissions;
