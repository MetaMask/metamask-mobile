/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react';
import { State } from 'react-native-ble-plx';
import { Subscription } from 'rxjs';

const useBluetooth = (hasBluetoothPermissions: boolean) => {
  const [bluetoothOn] = useState(false);
  const [bluetoothConnectionError] = useState<boolean>();

  // Monitoring for the BLE adapter to be turned on
  useEffect(() => {
    if (hasBluetoothPermissions) {
      let subscription: Subscription;

      return () => subscription?.unsubscribe();
    }
  }, [hasBluetoothPermissions, bluetoothOn]);

  return {
    bluetoothOn,
    bluetoothConnectionError,
  };
};

export default useBluetooth;
