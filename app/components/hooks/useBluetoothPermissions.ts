import { useState, useRef, useLayoutEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getSystemVersion } from 'react-native-device-info';
import {
  PERMISSIONS,
  RESULTS,
  request,
  requestMultiple,
} from 'react-native-permissions';
import Device from '../../util/device';
import { BluetoothPermissionErrors } from '../../core/Ledger/ledgerErrors';

const useBluetoothPermissions = () => {
  const appState = useRef(AppState.currentState);
  const [hasBluetoothPermissions, setHasBluetoothPermissions] =
    useState<boolean>(false);
  const [bluetoothPermissionError, setBluetoothPermissionError] =
    useState<BluetoothPermissionErrors>();
  const deviceOSVersion = Number(getSystemVersion()) || 0;

  const checkIosPermission = async () => {
    const bluetoothPermissionStatus = await request(
      PERMISSIONS.IOS.BLUETOOTH_PERIPHERAL,
    );
    const bluetoothAllowed = bluetoothPermissionStatus === RESULTS.GRANTED;

    if (bluetoothAllowed) {
      setHasBluetoothPermissions(true);
      setBluetoothPermissionError(undefined);
    } else {
      setBluetoothPermissionError(
        BluetoothPermissionErrors.BluetoothAccessBlocked,
      );
    }
  };

  const checkAndroidPermission = async () => {
    let hasError = false;

    if (deviceOSVersion >= 12) {
      const result = await requestMultiple([
        PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
        PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
      ]);

      if (
        result[PERMISSIONS.ANDROID.BLUETOOTH_CONNECT] !== RESULTS.GRANTED ||
        result[PERMISSIONS.ANDROID.BLUETOOTH_SCAN] !== RESULTS.GRANTED
      ) {
        setBluetoothPermissionError(
          BluetoothPermissionErrors.NearbyDevicesAccessBlocked,
        );
        hasError = true;
      }
    } else {
      const bluetoothPermissionStatus = await request(
        PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      );

      if (bluetoothPermissionStatus !== RESULTS.GRANTED) {
        setBluetoothPermissionError(
          BluetoothPermissionErrors.LocationAccessBlocked,
        );
        hasError = true;
      }
    }

    if (!hasError) {
      setHasBluetoothPermissions(true);
      setBluetoothPermissionError(undefined);
    }
  };

  // Checking if app has required permissions every time the app becomes active
  const checkPermissions = async () => {
    if (Device.isIos()) {
      await checkIosPermission();
    }

    if (Device.isAndroid()) {
      await checkAndroidPermission();
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
