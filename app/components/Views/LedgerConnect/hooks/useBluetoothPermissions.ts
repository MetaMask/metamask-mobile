import { useState, useRef, useLayoutEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getSystemVersion } from 'react-native-device-info';
import { PERMISSIONS, RESULTS, request } from 'react-native-permissions';
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
  const deviceOSVersion = Number(getSystemVersion()) ?? '';

  // Checking if app has required permissions every time the app becomes active
  const checkPermissions = async () => {
    setBluetoothPermissionError(undefined);

    if (Device.isIos()) {
      const bluetoothPermissionStatus = await request(
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
      let bluetoothAllowed: boolean;
      const bluetoothPermissionStatus = await request(
        PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      );

      if (deviceOSVersion >= 12) {
        const connectPermissionStatus = await request(
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
        );
        const scanPermissionStatus = await request(
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
        );

        bluetoothAllowed =
          connectPermissionStatus === RESULTS.GRANTED &&
          scanPermissionStatus === RESULTS.GRANTED;
      } else {
        bluetoothAllowed = bluetoothPermissionStatus === RESULTS.GRANTED;
      }

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

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    checkPermissions();
    return () => {
      subscription.remove();
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
