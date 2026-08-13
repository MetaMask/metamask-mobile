import { Linking, Platform } from 'react-native';
import {
  PERMISSIONS,
  RESULTS,
  requestMultiple,
  request,
} from 'react-native-permissions';
import { getSystemVersion } from 'react-native-device-info';

/**
 * Ensure the Android Bluetooth Low Energy (BLE) runtime permissions are
 * granted, opening the system settings screen if a required permission is
 * denied. Shared by the Ledger BLE adapters so neither re-implements the
 * version-split permission logic.
 *
 * @returns `true` when the app is permitted to use Bluetooth.
 */
export async function ensureLedgerPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  // getSystemVersion() returns the Android version string (e.g. "12", "13",
  // "14.1"). Coercing via Number() gives a numeric major version we can
  // compare against 12 (the API 31 split where BLUETOOTH_CONNECT/SCAN
  // replaced ACCESS_FINE_LOCATION for BLE).
  const version = Number(getSystemVersion()) || 0;

  if (version >= 12) {
    const result = await requestMultiple([
      PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
      PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
    ]);
    const allGranted =
      result[PERMISSIONS.ANDROID.BLUETOOTH_CONNECT] === RESULTS.GRANTED &&
      result[PERMISSIONS.ANDROID.BLUETOOTH_SCAN] === RESULTS.GRANTED;

    if (!allGranted) {
      await Linking.openSettings();
      return false;
    }
  } else {
    const result = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
    if (result !== RESULTS.GRANTED) {
      await Linking.openSettings();
      return false;
    }
  }

  return true;
}
